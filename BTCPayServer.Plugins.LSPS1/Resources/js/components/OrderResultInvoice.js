// OrderResultInvoice.js - Utilities for rendering Lightning invoices
window.OrderResultInvoice = {
  /**
   * Renders a Lightning invoice with QR code
   * @param {string} invoice - The BOLT11 invoice to render
   * @param {object} statusData - The full status data object to get total amount
   * @returns {React.Element} - React element with the rendered invoice
   */
  renderInvoice: function(invoice, statusData) {
    // Generate lightning: URL for the invoice
    const lightningUrl = `lightning:${invoice}`;
    
    // Function to copy invoice to clipboard
    const copyToClipboard = () => {
      navigator.clipboard.writeText(invoice)
        .then(() => {
          // Create a toast notification element
          const toast = document.createElement('div');
          toast.className = 'toast align-items-center text-white bg-success border-0 position-fixed top-0 end-0 m-3';
          toast.setAttribute('role', 'alert');
          toast.setAttribute('aria-live', 'assertive');
          toast.setAttribute('aria-atomic', 'true');
          toast.style.zIndex = '1050';
          
          toast.innerHTML = `
            <div class="d-flex">
              <div class="toast-body">
                Invoice copied to clipboard!
              </div>
              <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
          `;
          
          document.body.appendChild(toast);
          
          // Use Bootstrap's toast API if available, otherwise just show/hide with timeout
          if (window.bootstrap && window.bootstrap.Toast) {
            const bsToast = new window.bootstrap.Toast(toast);
            bsToast.show();
          } else {
            toast.classList.add('show');
            setTimeout(() => {
              toast.classList.remove('show');
              setTimeout(() => {
                document.body.removeChild(toast);
              }, 300);
            }, 3000);
          }
        })
        .catch(err => console.error('Failed to copy invoice:', err));
    };
    
    // Get the amount from statusData if available
    let totalSats = null;
    if (statusData) {
      if (statusData.paymentInfo && statusData.paymentInfo.totalSats) {
        totalSats = statusData.paymentInfo.totalSats;
      } else if (statusData.payment && statusData.payment.bolt11 && statusData.payment.bolt11.order_total_sat) {
        totalSats = statusData.payment.bolt11.order_total_sat;
      }
    }
    
    // As a fallback, try to decode the invoice to show amount if we couldn't get it from statusData
    if (!totalSats) {
      try {
        // Simple heuristic to extract amount from standard bolt11 invoice
        const amountMatch = invoice.match(/ln[a-z0-9]+([0-9]+)[a-z0-9]/i);
        if (amountMatch && amountMatch[1]) {
          totalSats = parseInt(amountMatch[1], 10);
        }
      } catch (e) {
        console.error("Error parsing invoice amount:", e);
      }
    }
    
    // Create a simple text QR representation when the QRCode library isn't available
    const createTextQR = (text) => {
      const div = document.createElement('div');
      div.style.padding = '15px';
      div.style.background = '#fff';
      div.style.borderRadius = '4px';
      div.style.color = '#000';
      div.style.fontSize = '12px';
      div.style.textAlign = 'center';
      div.textContent = 'QR Code not available. Invoice: ' + text.substring(0, 20) + '...';
      return div;
    };
    
    return React.createElement('div', { className: 'mt-3 text-center' },
      React.createElement('h5', null, 'Pay this invoice to create your channel'),
      
      // QR code container using BTCPay Server's built-in QR code library
      React.createElement('div', { 
        className: 'qr-container mb-3', 
        style: { 
          position: 'relative',
          display: 'inline-block',
          cursor: 'pointer',
          background: 'white',
          padding: '10px',
          borderRadius: '8px',
          border: '1px solid rgba(0,0,0,0.125)' // Add border to QR code
        },
        onClick: copyToClipboard,
        ref: (el) => {
          if (el && !el.hasChildNodes()) {
            try {
              if (typeof QRCode === 'undefined') {
                console.warn('QRCode library is not defined. Loading script dynamically.');
                
                // Try to load the QRCode library dynamically if not available
                const script = document.createElement('script');
                script.src = '/js/qrcode.js';
                script.onload = () => {
                  // Create QR code using the built-in BTCPay Server library once script is loaded
                  if (typeof QRCode !== 'undefined') {
                    try {
                      const qrCodeEl = document.createElement('div');
                      qrCodeEl.id = 'invoice-qrcode-' + Math.random().toString(36).substring(2, 9);
                      el.appendChild(qrCodeEl);
                      
                      // Initialize QR code with the built-in library
                      new QRCode(qrCodeEl, {
                        text: lightningUrl,
                        width: 256,
                        height: 256,
                        colorDark: "#000000",
                        colorLight: "#ffffff",
                        correctLevel: QRCode.CorrectLevel.M,
                        useSVG: true
                      });
                    } catch (err) {
                      console.error('Error creating QR code after loading library', err);
                      el.appendChild(createTextQR(lightningUrl));
                    }
                  } else {
                    el.appendChild(createTextQR(lightningUrl));
                  }
                };
                script.onerror = () => {
                  console.error('Failed to load QRCode library');
                  el.appendChild(createTextQR(lightningUrl));
                };
                document.head.appendChild(script);
              } else {
                // QRCode is already available, create QR code
                const qrCodeEl = document.createElement('div');
                qrCodeEl.id = 'invoice-qrcode-' + Math.random().toString(36).substring(2, 9);
                el.appendChild(qrCodeEl);
                
                // Initialize QR code with the built-in library
                new QRCode(qrCodeEl, {
                  text: lightningUrl,
                  width: 256,
                  height: 256,
                  colorDark: "#000000",
                  colorLight: "#ffffff",
                  correctLevel: QRCode.CorrectLevel.M,
                  useSVG: true
                });
              }
            } catch (err) {
              console.error('Error rendering QR code:', err);
              el.appendChild(createTextQR(lightningUrl));
            }
          }
        }
      }),
      
      // Show amount if available
      totalSats && React.createElement('p', { className: 'mb-3 fs-5' },
        `${Number(totalSats).toLocaleString()} satoshis`
      ),
      
      // Updated copy button with more prominent styling like BTCPay Server
      React.createElement('button', {
        className: 'btn btn-primary btn-lg mb-3',
        type: 'button',
        onClick: copyToClipboard
      }, 
      React.createElement('i', { className: 'bi bi-clipboard me-2' }),
      'Copy Invoice')
    );
  }
};