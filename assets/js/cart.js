/* ==========================================================================
   Acoperiș PRO — Coș de cumpărături (localStorage)
   API global: Cart.add / remove / setQty / items / count / subtotal / clear
   ========================================================================== */

const Cart = (() => {
  const KEY = 'acoperispro_cart_v1';

  function read() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  }
  function write(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    document.dispatchEvent(new CustomEvent('cart:change', { detail: items }));
  }

  function add(id, qty = 1) {
    const items = read();
    const found = items.find(i => i.id === id);
    if (found) found.qty += qty;
    else items.push({ id, qty });
    write(items);
  }
  function setQty(id, qty) {
    let items = read();
    qty = Math.max(1, parseInt(qty) || 1);
    const found = items.find(i => i.id === id);
    if (found) found.qty = qty;
    write(items);
  }
  function remove(id) {
    write(read().filter(i => i.id !== id));
  }
  function clear() { write([]); }

  function items() { return read(); }
  function count() { return read().reduce((s, i) => s + i.qty, 0); }
  function subtotal() {
    return read().reduce((s, i) => {
      const p = getProduct(i.id);
      return s + (p ? p.price * i.qty : 0);
    }, 0);
  }

  return { add, setQty, remove, clear, items, count, subtotal };
})();

/* Actualizează bulina din header cu numărul de produse */
function refreshCartBadge() {
  const el = document.querySelector('.cart-count');
  if (!el) return;
  const n = Cart.count();
  el.textContent = n;
  el.style.display = n > 0 ? 'flex' : 'none';
}

document.addEventListener('cart:change', refreshCartBadge);
document.addEventListener('DOMContentLoaded', refreshCartBadge);
