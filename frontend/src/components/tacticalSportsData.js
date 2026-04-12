// Shared tactical sports field definitions
const TACTICAL_SPORTS = [
  {
    id: 'football', name: 'Futbol', color: '#1e3a1e',
    viewBox: '0 0 300 420',
    svg: `<rect x="15" y="15" width="270" height="390" rx="2"/><line x1="15" y1="210" x2="285" y2="210"/><circle cx="150" cy="210" r="42"/><circle cx="150" cy="210" r="2.5" fill="rgba(255,255,255,0.6)"/><rect x="70" y="15" width="160" height="70"/><rect x="105" y="15" width="90" height="30"/><path d="M100 85 A32 32 0 0 0 200 85"/><rect x="115" y="5" width="70" height="12" rx="1"/><rect x="70" y="335" width="160" height="70"/><rect x="105" y="375" width="90" height="30"/><path d="M100 335 A32 32 0 0 1 200 335"/><rect x="115" y="403" width="70" height="12" rx="1"/><path d="M15 27 A12 12 0 0 0 27 15"/><path d="M273 15 A12 12 0 0 0 285 27"/><path d="M15 393 A12 12 0 0 1 27 405"/><path d="M273 405 A12 12 0 0 1 285 393"/>`
  },
  {
    id: 'basketball', name: 'Basket', color: '#4a3728',
    viewBox: '0 0 300 420',
    svg: `<rect x="15" y="15" width="270" height="390" rx="2"/><line x1="15" y1="210" x2="285" y2="210"/><circle cx="150" cy="210" r="28"/><rect x="95" y="15" width="110" height="55"/><circle cx="150" cy="70" r="8"/><rect x="140" y="15" width="20" height="3"/><path d="M70 15 A95 95 0 0 0 230 15"/><path d="M95 70 A55 55 0 0 0 205 70"/><rect x="95" y="350" width="110" height="55"/><circle cx="150" cy="350" r="8"/><rect x="140" y="402" width="20" height="3"/><path d="M70 405 A95 95 0 0 1 230 405"/><path d="M95 350 A55 55 0 0 1 205 350"/>`
  },
  {
    id: 'volleyball', name: 'Voley', color: '#1a3a5a',
    viewBox: '0 0 300 420',
    svg: `<rect x="15" y="15" width="270" height="390" rx="2"/><line x1="15" y1="210" x2="285" y2="210" stroke-width="3"/><line x1="12" y1="205" x2="12" y2="215"/><line x1="288" y1="205" x2="288" y2="215"/><line x1="15" y1="140" x2="285" y2="140" stroke-dasharray="6 4"/><line x1="15" y1="280" x2="285" y2="280" stroke-dasharray="6 4"/>`
  },
  {
    id: 'handball', name: 'Handball', color: '#2a3a1e',
    viewBox: '0 0 300 420',
    svg: `<rect x="15" y="15" width="270" height="390" rx="2"/><line x1="15" y1="210" x2="285" y2="210"/><circle cx="150" cy="210" r="2.5" fill="rgba(255,255,255,0.6)"/><path d="M90 15 A70 70 0 0 0 210 15"/><path d="M90 405 A70 70 0 0 1 210 405"/><rect x="105" y="5" width="90" height="12" rx="1"/><rect x="105" y="403" width="90" height="12" rx="1"/>`
  },
  {
    id: 'futsal', name: 'Futsal', color: '#3a2e1e',
    viewBox: '0 0 300 420',
    svg: `<rect x="15" y="15" width="270" height="390" rx="2"/><line x1="15" y1="210" x2="285" y2="210"/><circle cx="150" cy="210" r="30"/><circle cx="150" cy="210" r="2.5" fill="rgba(255,255,255,0.6)"/><rect x="80" y="15" width="140" height="55"/><path d="M110 70 A45 45 0 0 0 190 70"/><rect x="125" y="5" width="50" height="12" rx="1"/><rect x="80" y="350" width="140" height="55"/><path d="M110 350 A45 45 0 0 1 190 350"/><rect x="125" y="403" width="50" height="12" rx="1"/>`
  },
  {
    id: 'tennis', name: 'Tenis', color: '#1a4a2e',
    viewBox: '0 0 300 420',
    svg: `<rect x="30" y="15" width="240" height="390" rx="2"/><line x1="30" y1="210" x2="270" y2="210" stroke-width="3"/><line x1="150" y1="80" x2="150" y2="340"/><rect x="30" y="80" width="240" height="260"/><line x1="30" y1="145" x2="270" y2="145"/><line x1="30" y1="275" x2="270" y2="275"/>`
  },
];

export default TACTICAL_SPORTS;
