import re
F='/app/frontend/src/pages/SuperAdminPage.js'
src=open(F,encoding='utf-8').read()
# Proteger la zona de helpers/imports (no tocar antes de "// Material Design 3")
idx=src.index('// Material Design 3')
head, body = src[:idx], src[idx:]
hint=re.compile(r'[A-Za-zÁÉÍÓÚáéíóúñ]')
def esc(s): return s.replace('\\','\\\\').replace("'", "\\'")
n=[0,0,0]

# 1) JSX direct text: >TEXT<  (una sola línea, sin operadores)
def repl_text(m):
    pre,txt,post=m.group(1),m.group(2),m.group(3)
    t=txt.strip()
    if not hint.search(t): return m.group(0)
    if 'tt(' in t: return m.group(0)
    if t.startswith('&') and t.endswith(';'): return m.group(0)
    lead=txt[:len(txt)-len(txt.lstrip())]; trail=txt[len(txt.rstrip()):]
    n[0]+=1
    return f"{pre}{lead}{{tt('{esc(t)}')}}{trail}{post}"
# char antes de '>' no debe ser operador; texto sin newline/operadores/;()=
body=re.sub(r'(?<![=<>!+\-*/&|])(>)([^<>{}\n;=()]*?[A-Za-zÁÉÍÓÚáéíóúñ][^<>{}\n;=()]*?)(<)', repl_text, body)

# 2) Atributos string: label= placeholder= title= description=
def repl_attr(m):
    attr,q,val=m.group(1),m.group(2),m.group(3)
    if not hint.search(val) or 'tt(' in val: return m.group(0)
    n[1]+=1
    return f"{attr}={{tt('{esc(val)}')}}"
body=re.sub(r'\b(label|placeholder|title|description)=(["\'])([^"\']{2,90})\2', repl_attr, body)

# 3) toasts simples (sin template ${})
def repl_toast(m):
    fn,q,val=m.group(1),m.group(2),m.group(3)
    if not hint.search(val): return m.group(0)
    n[2]+=1
    return f"toast.{fn}(tt('{esc(val)}')"
body=re.sub(r'toast\.(\w+)\((["\'])([^"\'$]{3,110})\2', repl_toast, body)

open(F,'w',encoding='utf-8').write(head+body)
print('wrapped jsx_text=%d attrs=%d toasts=%d'%(n[0],n[1],n[2]))
