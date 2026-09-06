// publish-client.js — Publish Catalog button support (loads after storage-engine)
(function () {
  if (!window.StoreBackend) return;

  if (typeof window.StoreBackend.publishProducts !== 'function') {
    window.StoreBackend.publishProducts = async function () {
      const token = this.getToken ? this.getToken() : (sessionStorage.getItem('brand_admin_token') || localStorage.getItem('brand_admin_token'));
      if (!this.isStaticMode && token) {
        try {
          const res = await fetch('/api/products/publish', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + token
            }
          });
          if (res.ok) return await res.json();
        } catch (e) {
          console.warn('Publish API:', e.message);
        }
      }
      try {
        const products = await this.getProducts();
        const payload = {
          published_at: new Date().toISOString(),
          count: products.length,
          products: products
        };
        localStorage.setItem('brand_products_published', JSON.stringify(payload));
        localStorage.setItem('brand_products', JSON.stringify(products));
        return {
          success: true,
          message: 'Published ' + products.length + ' products locally',
          count: products.length,
          published_at: payload.published_at,
          mode: 'local'
        };
      } catch (err) {
        return { success: false, error: err.message };
      }
    };
  }

  window.handlePublishProducts = async function () {
    const btn = document.getElementById('btnPublishProducts');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Publishing...';
    }
    try {
      const result = await window.StoreBackend.publishProducts();
      if (result && result.success) {
        const count = result.count != null ? result.count : '';
        const extra = (result.r2 && result.r2.uploaded) ? ' (Cloudflare R2)' : '';
        if (typeof showToast === 'function') {
          showToast((result.message || ('Published ' + count + ' products')) + extra, 'success');
        }
        const statusEl = document.getElementById('publishStatusHint');
        if (statusEl) {
          statusEl.textContent = 'Last published: ' + (result.published_at ? new Date(result.published_at).toLocaleString() : 'just now') + ' · ' + count + ' products';
          statusEl.style.display = 'block';
        }
      } else if (typeof showToast === 'function') {
        showToast('Publish failed: ' + ((result && result.error) || 'Unknown error'), 'error');
      }
    } catch (err) {
      if (typeof showToast === 'function') showToast('Publish error: ' + err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '🚀 <span data-i18n="publishProductsBtn">Publish Catalog</span>';
      }
    }
  };
})();
