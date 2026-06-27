import re, sys, shutil
F=sys.argv[1]; MARKER=sys.argv[2]
shutil.copy(F, '/tmp/'+F.split('/')[-1]+'.bak')
src=open(F,encoding='utf-8').read()
idx=src.index(MARKER)
head, body = src[:idx], src[idx:]
hint=re.compile(r'[A-Za-zÁÉÍÓÚáéíóúñ]')
def esc(s): return s.replace('\\','\\\\').replace("'", "\\'")
n=[0,0,0]
def repl_text(m):
    pre,txt,post=m.group(1),m.group(2),m.group(3)
    t=txt.strip()
    if not hint.search(t) or 'tt(' in t: return m.group(0)
    if t.startswith('&') and t.endswith(';'): return m.group(0)
    lead=txt[:len(txt)-len(txt.lstrip())]; trail=txt[len(txt.rstrip()):]
    n[0]+=1
    return f"{pre}{lead}{{tt('{esc(t)}')}}{trail}{post}"
body=re.sub(r'(?<![=<>!+\-*/&|])(>)([^<>{}\n;=()]*?[A-Za-zÁÉÍÓÚáéíóúñ][^<>{}\n;=()]*?)(<)', repl_text, body)
def repl_attr(m):
    attr,q,val=m.group(1),m.group(2),m.group(3)
    if not hint.search(val) or 'tt(' in val: return m.group(0)
    n[1]+=1
    return f"{attr}={{tt('{esc(val)}')}}"
body=re.sub(r'\b(label|placeholder|title|description|aria-label)=(["\'])([^"\']{2,90})\2', repl_attr, body)
def repl_toast(m):
    fn,q,val=m.group(1),m.group(2),m.group(3)
    if not hint.search(val): return m.group(0)
    n[2]+=1
    return f"toast.{fn}(tt('{esc(val)}')"
body=re.sub(r'toast\.(\w+)\((["\'])([^"\'$]{3,110})\2', repl_toast, body)
open(F,'w',encoding='utf-8').write(head+body)
print('wrapped jsx=%d attrs=%d toasts=%d'%(n[0],n[1],n[2]))
