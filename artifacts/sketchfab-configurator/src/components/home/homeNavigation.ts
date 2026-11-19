/** Return to the atlas menus without opening the full, memory-intensive model. */
export function backToAtlasMenus(reduce: boolean) {
  const header = document.getElementById('atlas-navigation');
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  const focusMenu = () => {
    const controls = header?.querySelectorAll<HTMLElement>('.sn-links button, .sn-links a, .sn-toggle');
    const target = Array.from(controls ?? []).find(el => el.getClientRects().length > 0);
    target?.focus({ preventScroll: true });
  };
  if (reduce || window.scrollY <= 2) {
    focusMenu();
    return;
  }
  let done = false;
  let timeout: number;
  const finish = () => {
    if (done) return;
    done = true;
    window.removeEventListener('scroll', onScroll);
    window.clearTimeout(timeout);
    focusMenu();
  };
  const onScroll = () => { if (window.scrollY <= 2) finish(); };
  window.addEventListener('scroll', onScroll, { passive: true });
  timeout = window.setTimeout(finish, 1600);
}
