// publish-client.js — Publish Catalog button (works even if StoreBackend loads late)
(function () {
  'use strict';

  function ensurePublishApi() {
    if (!window.StoreBackend) return false;
    if (typeof window.StoreBackend.publishProducts === 'function') return true;

    window.StoreBackend.publishProducts = async function () {
      var token = null;
      try {
        if (this.getToken) token = this.getToken();
      } catch (e) {}
      if (!token) {
        token = sessionStorage.getItem('brand_admin_token') || localStorage.getItem('brand_admin_token');
      }

      // Live backend + admin token → real publish (local JSON + optional R2)
      if (!this.isStaticMode && token) {
        try {
          var res = await fetch('/api/products/publish', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + token
            }
          });
          if (res.ok) return await res.json();
          var errBody = await res.json().catch(function () { return {}; });
          // Fall through to local if 404 (route missing); otherwise report error
          if (res.status !== 404 && res.status !== 405) {
            return {
              success: false,
              error: errBody.error || ('Publish failed (HTTP ' + res.status + '). Unlock admin and try again.')
            };
          }
        } catch (e) {
          console.warn('Publish API:', e.message);
        }
      }

      // Local / static fallback — still updates local catalog for the shop
      try {
        var products = await this.getProducts();
        var payload = {
          published_at: new Date().toISOString(),
          count: products.length,
          products: products
        };
        localStorage.setItem('brand_products_published', JSON.stringify(payload));
        localStorage.setItem('brand_products', JSON.stringify(products));
        return {
          success: true,
          message: 'Published ' + products.length + ' products locally' +
            (token ? '' : ' (unlock admin + run npm start for server/R2 publish)'),
          count: products.length,
          published_at: payload.published_at,
          mode: 'local'
        };
      } catch (err) {
        return { success: false, error: err.message || String(err) };
      }
    };
    return true;
  }

  // Always define the click handler so the button never does nothing
  window.handlePublishProducts = async function () {
    var btn = document.getElementById('btnPublishProducts');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Publishing...';
    }

    try {
      // Wait briefly for StoreBackend if scripts race
      if (!ensurePublishApi()) {
        for (var i = 0; i < 20 && !ensurePublishApi(); i++) {
          await new Promise(function (r) { setTimeout(r, 100); });
        }
      }

      if (!window.StoreBackend || typeof window.StoreBackend.publishProducts !== 'function') {
        if (typeof showToast === 'function') {
          showToast('Publish not ready — refresh the page and unlock admin.', 'error');
        } else {
          alert('Publish not ready — refresh the page and unlock admin.');
        }
        return;
      }

      var result = await window.StoreBackend.publishProducts();

      if (result && result.success) {
        var count = result.count != null ? result.count : '';
        var extra = (result.r2 && result.r2.uploaded) ? ' + Cloudflare R2' : '';
        var msg = (result.message || ('Published ' + count + ' products')) + extra;
        if (typeof showToast === 'function') showToast(msg, 'success');
        else alert(msg);

        var statusEl = document.getElementById('publishStatusHint');
        if (statusEl) {
          statusEl.textContent =
            'Last published: ' +
            (result.published_at ? new Date(result.published_at).toLocaleString() : 'just now') +
            ' · ' + count + ' products';
          statusEl.style.display = 'block';
        }
      } else {
        var errMsg = 'Publish failed: ' + ((result && result.error) || 'Unknown error');
        if (typeof showToast === 'function') showToast(errMsg, 'error');
        else alert(errMsg);
      }
    } catch (err) {
      var e = 'Publish error: ' + (err && err.message ? err.message : String(err));
      if (typeof showToast === 'function') showToast(e, 'error');
      else alert(e);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '\uD83D\uDE80 <span data-i18n="publishProductsBtn">Publish Catalog</span>';
      }
    }
  };

  // Attach API as soon as possible + on DOM ready
  ensurePublishApi();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensurePublishApi);
  }
  setTimeout(ensurePublishApi, 0);
  setTimeout(ensurePublishApi, 500);
  setTimeout(ensurePublishApi, 1500);
})();
