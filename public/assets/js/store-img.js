/* ==========================================================================
   Acoperiș PRO — Stocare imagini în browser (IndexedDB)
   Folosit de sistemul de import imagini. Cheile au forma:
     p:<id-produs>     (ex. p:tm-clasic-05)
     c:<id-categorie>  (ex. c:tigla-metalica)
   Imaginile încărcate aici sunt vizibile în browserul curent (ideal pentru
   prezentări / machete). Pentru a le face permanente și vizibile tuturor,
   folosește butonul „Exportă pentru repo" și comite fișierele.
   ========================================================================== */

const ImgStore = (() => {
  const DB = 'acoperispro_media', STORE = 'images', VER = 1;
  let _db = null;

  function open() {
    return new Promise((res, rej) => {
      if (_db) return res(_db);
      let req;
      try { req = indexedDB.open(DB, VER); }
      catch (e) { return rej(e); }
      req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
      req.onsuccess = () => { _db = req.result; res(_db); };
      req.onerror = () => rej(req.error);
    });
  }

  async function put(key, blob) {
    const db = await open();
    return new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(blob, key);
      tx.oncomplete = () => res(true);
      tx.onerror = () => rej(tx.error);
    });
  }
  async function get(key) {
    const db = await open();
    return new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readonly');
      const rq = tx.objectStore(STORE).get(key);
      rq.onsuccess = () => res(rq.result || null);
      rq.onerror = () => rej(rq.error);
    });
  }
  async function del(key) {
    const db = await open();
    return new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => res(true);
      tx.onerror = () => rej(tx.error);
    });
  }
  async function keys() {
    const db = await open();
    return new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readonly');
      const rq = tx.objectStore(STORE).getAllKeys();
      rq.onsuccess = () => res(rq.result || []);
      rq.onerror = () => rej(rq.error);
    });
  }

  return { put, get, del, keys };
})();
