/**
 * no-base64-images.js
 * Keeps the site small: never store product images as base64/data URLs.
 * Always upload binary to Cloudflare R2 (or server /uploads) and save only a short URL.
 */
(function () {
  'use strict';

  function isDataUrl(s) {
    return typeof s === 'string' && /^data:image\//i.test(s.trim());
  }

  function toast(msg, type) {
    if (typeof showToast === 'function') showToast(msg, type || 'error');
    else console.warn(msg);
  }

  function stripBase64Products(list) {
    if (!Array.isArray(list)) return list;
    return list.filter(function (p) {
      return p && !isDataUrl(p.image);
    });
  }

  function patchBackend() {
    if (!window.StoreBackend) return false;

    window.StoreBackend.uploadImage = async function (fileOrDataUrl) {
      if (typeof File !== 'undefined' && (fileOrDataUrl instanceof File || fileOrDataUrl instanceof Blob)) {
        try {
          var formData = new FormData();
          formData.append('image', fileOrDataUrl, fileOrDataUrl.name || 'product.jpg');
          var headers = {};
          var token = this.getToken ? this.getToken() : null;
          if (token) headers['Authorization'] = 'Bearer ' + token;

          var res = await fetch('/api/upload/r2', { method: 'POST', headers: headers, body: formData });
          if (res.ok) {
            var data = await res.json();
            if (data && data.url && !isDataUrl(data.url)) {
              return data;
            }
            return { success: false, error: 'Server returned an invalid image URL' };
          }
          var err = await res.json().catch(function () { return {}; });
          return {
            success: false,
            error: err.error || ('Upload failed (HTTP ' + res.status + '). Run the backend and configure R2 — images are not stored as base64.')
          };
        } catch (e) {
          return {
            success: false,
            error: 'Upload failed: ' + e.message + '. Start the server (npm start) and set R2 so images stay off the website.'
          };
        }
      }

      if (isDataUrl(fileOrDataUrl)) {
        return {
          success: false,
          error: 'Base64 images are blocked to keep the site small. Upload the file so it goes to Cloudflare R2 / server storage.'
        };
      }

      return { success: false, error: 'Invalid file — pick an image from your gallery' };
    };

    if (window.StoreBackend.addProduct && !window.StoreBackend._noBase64AddPatched) {
      var origAdd = window.StoreBackend.addProduct.bind(window.StoreBackend);
      window.StoreBackend.addProduct = async function (product) {
        if (product && isDataUrl(product.image)) {
          return {
            success: false,
            error: 'Product image cannot be base64. Upload the picture to Cloudflare R2 first (short URL only).'
          };
        }
        return origAdd(product);
      };
      window.StoreBackend._noBase64AddPatched = true;
    }

    if (window.StoreBackend.getProducts && !window.StoreBackend._noBase64GetPatched) {
      var origGet = window.StoreBackend.getProducts.bind(window.StoreBackend);
      window.StoreBackend.getProducts = async function () {
        var list = await origGet();
        return stripBase64Products(list);
      };
      window.StoreBackend._noBase64GetPatched = true;
    }

    if (window.StoreBackend.publishProducts && !window.StoreBackend._noBase64PublishPatched) {
      var origPub = window.StoreBackend.publishProducts.bind(window.StoreBackend);
      window.StoreBackend.publishProducts = async function () {
        var result = await origPub();
        try {
          var raw = localStorage.getItem('brand_products');
          if (raw) {
            var cleaned = stripBase64Products(JSON.parse(raw));
            localStorage.setItem('brand_products', JSON.stringify(cleaned));
          }
        } catch (e) {}
        return result;
      };
      window.StoreBackend._noBase64PublishPatched = true;
    }

    return true;
  }

  if (!patchBackend()) {
    document.addEventListener('DOMContentLoaded', function () {
      setTimeout(patchBackend, 0);
      setTimeout(patchBackend, 400);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('addProductForm') || document.querySelector('form[id*="roduct"]');
    if (form) {
      form.addEventListener('submit', function (e) {
        var input = document.getElementById('productImage');
        if (input && isDataUrl(input.value)) {
          e.preventDefault();
          e.stopPropagation();
          toast('Image is still base64 — wait for R2 upload to finish, or pick the file again.', 'error');
        }
      }, true);
    }
  });
})();
