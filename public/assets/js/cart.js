/* ==========================================================================
   Acoperiș PRO — Coș de cumpărături (localStorage)
   Suportă variante de produs (opțiuni: finisaj / grosime / culoare).
   Fiecare combinație unică produs+opțiuni = o linie separată în coș.
   Linie: { id, qty, opts }  →  cheie: keyOf(id, opts)
   ========================================================================== */

const Cart = (() => {
  const KEY = 'acoperispro_cart_v2';

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  }
  function write(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    document.dispatchEvent(new CustomEvent('cart:change', { detail: items }));
  }

  // Cheie stabilă pentru o linie (produs + opțiuni sortate)
  function keyOf(id, opts) {
    const o = opts || {};
    const ks = Object.keys(o).sort();
    return ks.length ? id + '|' + ks.map(k => k + '=' + o[k]).join(';') : id;
  }
  function lineKey(it) { return keyOf(it.id, it.opts); }

  function add(id, qty = 1, opts) {
    // Dacă nu s-au dat opțiuni, folosește valorile implicite ale produsului
    if (opts === undefined && typeof getProduct === 'function' && typeof defaultOpts === 'function') {
      const p = getProduct(id);
      if (p) opts = defaultOpts(p);
    }
    opts = opts || {};
    const items = read();
    const k = keyOf(id, opts);
    const found = items.find(i => keyOf(i.id, i.opts) === k);
    if (found) found.qty += qty;
    else items.push({ id, qty, opts });
    write(items);
  }
  function setQty(key, qty) {
    const items = read();
    qty = Math.max(1, parseInt(qty) || 1);
    const found = items.find(i => lineKey(i) === key);
    if (found) found.qty = qty;
    write(items);
  }
  function remove(key) {
    write(read().filter(i => lineKey(i) !== key));
  }
  function clear() { write([]); }

  // Fiecare item primește și `.key` pentru comoditate la randare
  function items() { return read().map(i => ({ id: i.id, qty: i.qty, opts: i.opts || {}, key: lineKey(i) })); }
  function count() { return read().reduce((s, i) => s + i.qty, 0); }

  // Preț unitar cu delta-urile opțiunilor aplicate
  function unitPrice(it) {
    const p = getProduct(it.id);
    if (!p) return 0;
    return (typeof optionPrice === 'function') ? optionPrice(p, it.opts) : p.price;
  }
  function subtotal() {
    return read().reduce((s, i) => s + unitPrice({ id: i.id, opts: i.opts }) * i.qty, 0);
  }

  return { add, setQty, remove, clear, items, count, subtotal, unitPrice, keyOf };
})();

/* Actualizează bulina din header cu numărul de produse */
function refreshCartBadge() {
  const el = document.querySelector('.cart-count');
  if (!el) return;
  const n = Cart.count();
  el.textContent = n;
  el.style.display = n > 0 ? 'flex' : 'none';
  // Total în butonul de coș (injectat o singură dată, apare pe toate paginile)
  const btn = el.closest('.cart-btn');
  if (btn) {
    let tot = btn.querySelector('.cart-total');
    if (!tot) { tot = document.createElement('span'); tot.className = 'cart-total'; el.parentNode.insertBefore(tot, el); }
    const sum = (typeof Cart.subtotal === 'function') ? Cart.subtotal() : 0;
    const show = n > 0 && sum > 0;
    tot.textContent = show ? (typeof formatPrice === 'function' ? formatPrice(sum) : sum.toFixed(2) + ' lei') : '';
    tot.style.display = show ? 'inline' : 'none';
  }
}

document.addEventListener('cart:change', refreshCartBadge);
document.addEventListener('DOMContentLoaded', refreshCartBadge);
