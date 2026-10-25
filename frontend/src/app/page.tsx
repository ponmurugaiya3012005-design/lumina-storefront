'use client';
import React, { useState, useEffect } from 'react';
import { ShoppingBag, Sparkles, Phone, Mail, CheckCircle, ArrowRight, ZoomIn, X, Rows3, Grid2X2, LayoutGrid, Image as ImageIcon, Trash2, Send, Clock } from 'lucide-react';
import initialStore from '@/data/store.config.json';
import { fetchStoreProfile, fetchStoreProducts, submitOrder } from '@/lib/api';
import { supabase } from '@/lib/supabase';

export default function Storefront() {
  const [store, setStore] = useState(initialStore);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<any[]>([]);
  const [selectedCat, setSelectedCat] = useState('All');
  const [gridCols, setGridCols] = useState<1 | 2 | 4>(2);
  const [previewProduct, setPreviewProduct] = useState<any | null>(null);
  const [showCartDrawer, setShowCartDrawer] = useState(false);
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState<any | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const t = setTimeout(() => setToastMessage(null), 2500);
      return () => clearTimeout(t);
    }
  }, [toastMessage]);

  // Customer order form state
  const [customerForm, setCustomerForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  });

  // Load live data from FastAPI backend on mount
  useEffect(() => {
    let isMounted = true;
    const loadLive = async () => {
      setLoading(true);
      try {
        const liveStore = await fetchStoreProfile(initialStore);
        if (isMounted && liveStore) setStore(liveStore);

        const liveProducts = await fetchStoreProducts();
        if (isMounted) {
          setProducts(liveProducts || []);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) setLoading(false);
      }
    };

    loadLive();

    // Live Realtime inventory updates via Supabase
    if (supabase) {
      try {
        const client = supabase;
        const channel = client
          .channel(`store-${initialStore.id}-products`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'products',
              filter: `store_id=eq.${initialStore.id}`,
            },
            async () => {
              const refreshed = await fetchStoreProducts();
              if (isMounted) setProducts(refreshed || []);
            }
          )
          .subscribe();

        return () => {
          isMounted = false;
          client.removeChannel(channel);
        };
      } catch (e) {
        console.error('Realtime subscription error:', e);
      }
    }
    return () => {
      isMounted = false;
    };
  }, []);

  const cats = ['All', ...Array.from(new Set(products.map((p: any) => p.category).filter(Boolean)))];
  const filtered = selectedCat === 'All' ? products : products.filter((p: any) => p.category === selectedCat);

  const cartTotal = cart.reduce((sum, item) => {
    const isRent = item.cartMode === 'rent';
    const rentPrice = item.rentalPrice ?? item.rental_price;
    const price = isRent && rentPrice ? rentPrice : (item.price || 0);
    return sum + Number(price);
  }, 0);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setOrderSubmitting(true);
    try {
      const orderPayload = {
        customerName: customerForm.name || 'Anonymous Customer',
        customerEmail: customerForm.email,
        customerPhone: customerForm.phone,
        shippingAddress: customerForm.address,
        items: cart.map(item => {
          const isRent = item.cartMode === 'rent';
          const rentPrice = item.rentalPrice ?? item.rental_price;
          return {
            productId: String(item.id),
            title: item.title,
            price: isRent && rentPrice ? rentPrice : item.price,
            quantity: 1,
            cartMode: item.cartMode || 'buy',
          };
        }),
        totalAmount: cartTotal,
        notes: customerForm.notes,
      };

      const res = await submitOrder(orderPayload);
      setOrderConfirmed(res);
      setCart([]);
    } catch (err: any) {
      alert(err.message || 'Failed to submit order');
    } finally {
      setOrderSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {store.showAnnouncement && (
        <div style={{ background: '#6366f1', color: '#fff', textAlign: 'center', padding: '9px 12px', fontSize: '12px', fontWeight: 600 }}>
          {store.announcement || '🎉 Spring Studio Collection is live — Free worldwide courier over $150'}
        </div>
      )}

      <header style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '14px 18px', background: 'rgba(9,13,22,0.95)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{store.name || 'Lumina Studio'}</h1>
            <p style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{store.tagline || 'Handcrafted lighting & ceramic vessels crafted in limited batches.'}</p>
          </div>
          <button
            onClick={() => setShowCartDrawer(true)}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', flexShrink: 0, position: 'relative' }}
          >
            <ShoppingBag size={16} />
            <span>Bag ({cart.length})</span>
            {cart.length > 0 && (
              <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: '#fff', fontSize: '10px', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                {cart.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="container" style={{ padding: '24px 16px', flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
            {cats.map((c: any) => (
              <button
                key={c}
                onClick={() => setSelectedCat(c)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: selectedCat === c ? '#6366f1' : 'transparent',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '12px',
                  whiteSpace: 'nowrap',
                }}
              >
                {c}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Layout:</span>
            <div className="layout-pill-selector">
              <button
                type="button"
                onClick={() => setGridCols(1)}
                className={`layout-pill-btn ${gridCols === 1 ? 'active' : ''}`}
                title="1 in a row"
              >
                <Rows3 size={12} />
                <span>1</span>
              </button>
              <button
                type="button"
                onClick={() => setGridCols(2)}
                className={`layout-pill-btn ${gridCols === 2 ? 'active' : ''}`}
                title="2 in a row (Default)"
              >
                <Grid2X2 size={12} />
                <span>2</span>
              </button>
              <button
                type="button"
                onClick={() => setGridCols(4)}
                className={`layout-pill-btn ${gridCols === 4 ? 'active' : ''}`}
                title="4 in a row"
              >
                <LayoutGrid size={12} />
                <span>4</span>
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
            <div style={{ width: '36px', height: '36px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
            <p style={{ fontSize: '14px', fontWeight: 600 }}>Loading live catalog...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <Sparkles size={32} style={{ color: '#6366f1', margin: '0 auto 12px', opacity: 0.8 }} />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>No live products found</h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '420px', margin: '0 auto' }}>
              {selectedCat === 'All'
                ? 'Your store is connected live. Add products to your inventory in Supabase or the StockCraft dashboard to show them here.'
                : `No products found under "${selectedCat}".`}
            </p>
          </div>
        ) : (
          <div className={gridCols === 1 ? 'products-grid-1' : gridCols === 4 ? 'products-grid-4' : 'products-grid-2'}>
            {filtered.map((p: any) => {
              const isRentable = Boolean(p.isRentable ?? p.is_rentable ?? (p.listingType === 'rent' || p.listing_type === 'rent'));
              const listingType = p.listingType || p.listing_type || (isRentable ? 'rent' : 'buy');
              const rentalPrice = p.rentalPrice ?? p.rental_price ?? null;
              const rentalPeriod = p.rentalPeriod || p.rental_period || 'day';
              const price = p.price ?? 0;

              return (
                <div key={p.id} className="card" style={{ ...(gridCols === 1 ? { flexDirection: 'row', alignItems: 'center', padding: '10px' } : {}) }}>
                  <div
                    className="card-img-wrapper"
                    onClick={() => p.images?.[0] && setPreviewProduct({ ...p, isRentable, listingType, rentalPrice, rentalPeriod, price })}
                    title={p.images?.[0] ? 'Tap to view enlarged image' : 'Product details'}
                    style={{ ...(gridCols === 1 ? { width: '80px', height: '80px', flexShrink: 0, borderRadius: '10px' } : {}), ...(p.images?.[0] ? {} : { display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.03)' }) }}
                  >
                    {p.images?.[0] ? (
                      <>
                        <img src={p.images[0]} alt={p.title} />
                        <div className="zoom-pill">
                          <ZoomIn size={10} />
                          <span>View</span>
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <ImageIcon size={22} style={{ color: '#64748b' }} />
                        <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 600 }}>Not uploaded</span>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#6366f1', fontWeight: 700 }}>{p.category}</span>
                      {isRentable && (
                        <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', background: listingType === 'rent' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(56, 189, 248, 0.2)', color: listingType === 'rent' ? '#d8b4fe' : '#7dd3fc', textTransform: 'uppercase' }}>
                          {listingType === 'rent' ? '⏱️ Rent' : '🔄 Buy/Rent'}
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: '13px', fontWeight: 700, margin: '2px 0 3px', color: '#fff', lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={p.title}>{p.title}</h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '6px', flexWrap: 'wrap', gap: '6px' }}>
                      <div>
                        {listingType === 'rent' ? (
                          <div>
                            <span style={{ fontSize: '14px', fontWeight: 800, color: '#c084fc' }}>
                              ₹{rentalPrice || price}<span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500 }}>/{rentalPeriod}</span>
                            </span>
                            <div style={{ fontSize: '9px', color: '#c084fc', fontWeight: 600, textTransform: 'uppercase' }}>Rental Only</div>
                          </div>
                        ) : (
                          <div>
                            <span style={{ fontSize: '15px', fontWeight: 800, color: '#fff' }}>₹{price}</span>
                            {isRentable && rentalPrice && (
                              <div style={{ fontSize: '10px', color: '#c084fc', fontWeight: 600 }}>
                                Rent: ₹{rentalPrice}/{rentalPeriod}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                        {listingType === 'both' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setCart([...cart, { ...p, cartMode: 'buy', rentalPrice, rentalPeriod, isRentable, listingType }]);
                                setToastMessage(`Added "${p.title}" to bag`);
                              }}
                              style={{ padding: '4px 7px', fontSize: '10px', borderRadius: '7px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                              title="Add to cart"
                            >
                              + Cart
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCart([...cart, { ...p, cartMode: 'buy', rentalPrice, rentalPeriod, isRentable, listingType }]);
                                setShowCartDrawer(true);
                              }}
                              className="btn-primary"
                              style={{ padding: '4px 8px', fontSize: '10px', whiteSpace: 'nowrap' }}
                              title="Buy item (Instant Checkout)"
                            >
                              Buy
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCart([...cart, { ...p, cartMode: 'rent', rentalPrice, rentalPeriod, isRentable, listingType }]);
                                setShowCartDrawer(true);
                              }}
                              style={{ padding: '4px 8px', fontSize: '10px', borderRadius: '7px', background: 'linear-gradient(135deg, #a855f7, #6366f1)', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                              title="Rent item"
                            >
                              Rent
                            </button>
                          </>
                        ) : listingType === 'rent' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setCart([...cart, { ...p, cartMode: 'rent', rentalPrice, rentalPeriod, isRentable, listingType }]);
                                setToastMessage(`Added "${p.title}" rental to bag`);
                              }}
                              style={{ padding: '4px 7px', fontSize: '10px', borderRadius: '7px', background: 'rgba(168, 85, 247, 0.18)', border: '1px solid rgba(168, 85, 247, 0.35)', color: '#e9d5ff', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                              title="Add rental to bag"
                            >
                              + Cart
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCart([...cart, { ...p, cartMode: 'rent', rentalPrice, rentalPeriod, isRentable, listingType }]);
                                setShowCartDrawer(true);
                              }}
                              style={{ padding: '5px 11px', fontSize: '11px', borderRadius: '7px', background: 'linear-gradient(135deg, #a855f7, #6366f1)', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                              title="Rent Now (Instant Checkout)"
                            >
                              Rent Now
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setCart([...cart, { ...p, cartMode: 'buy', rentalPrice, rentalPeriod, isRentable, listingType }]);
                                setToastMessage(`Added "${p.title}" to bag`);
                              }}
                              style={{ padding: '4px 7px', fontSize: '10px', borderRadius: '7px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                              title="Add to cart"
                            >
                              + Cart
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCart([...cart, { ...p, cartMode: 'buy', rentalPrice, rentalPeriod, isRentable, listingType }]);
                                setShowCartDrawer(true);
                              }}
                              className="btn-primary"
                              style={{ padding: '5px 11px', fontSize: '11px', whiteSpace: 'nowrap' }}
                              title="Buy Now (Instant Checkout)"
                            >
                              Buy
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
        <p>© 2026 {store.name || 'Lumina Studio'}. Full-Stack Architecture powered by Next.js & FastAPI.</p>
      </footer>

      {/* Lightbox Modal */}
      {previewProduct && (
        <div className="lightbox-backdrop" onClick={() => setPreviewProduct(null)}>
          <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{previewProduct.title}</span>
              <button
                onClick={() => setPreviewProduct(null)}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="lightbox-frame">
              <img
                src={previewProduct.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=800'}
                alt={previewProduct.title}
                className="lightbox-img"
              />
            </div>
            <div className="lightbox-footer">
              {(() => {
                const prevIsRent = Boolean(previewProduct.isRentable ?? previewProduct.is_rentable ?? (previewProduct.listingType === 'rent' || previewProduct.listing_type === 'rent'));
                const prevListType = previewProduct.listingType || previewProduct.listing_type || (prevIsRent ? 'rent' : 'buy');
                const prevRentPrice = previewProduct.rentalPrice ?? previewProduct.rental_price;
                const prevRentPeriod = previewProduct.rentalPeriod || previewProduct.rental_period || 'day';
                return (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#6366f1', fontWeight: 700 }}>{previewProduct.category}</span>
                          {prevIsRent && (
                            <span style={{ fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', background: prevListType === 'rent' ? 'rgba(168, 85, 247, 0.25)' : 'rgba(56, 189, 248, 0.25)', color: prevListType === 'rent' ? '#d8b4fe' : '#7dd3fc', textTransform: 'uppercase' }}>
                              {prevListType === 'rent' ? '⏱️ Rent' : '🔄 Buy/Rent'}
                            </span>
                          )}
                        </div>
                        <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: '2px 0 0' }}>{previewProduct.title}</h4>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {prevListType === 'rent' ? (
                          <span style={{ fontSize: '18px', fontWeight: 800, color: '#c084fc' }}>
                            ₹{prevRentPrice || previewProduct.price}<span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>/{prevRentPeriod}</span>
                          </span>
                        ) : (
                          <div>
                            <span style={{ fontSize: '18px', fontWeight: 800, color: '#10b981' }}>₹{previewProduct.price}</span>
                            {prevIsRent && prevRentPrice && (
                              <div style={{ fontSize: '11px', color: '#c084fc', fontWeight: 600 }}>
                                Rent: ₹{prevRentPrice}/{prevRentPeriod}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {previewProduct.description && (
                      <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px', lineHeight: 1.4 }}>{previewProduct.description}</p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      {prevListType === 'both' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setCart([...cart, { ...previewProduct, cartMode: 'buy', rentalPrice: prevRentPrice, rentalPeriod: prevRentPeriod, isRentable: prevIsRent, listingType: prevListType }]);
                              setToastMessage(`Added "${previewProduct.title}" to bag`);
                              setPreviewProduct(null);
                            }}
                            style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                          >
                            + Cart
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCart([...cart, { ...previewProduct, cartMode: 'buy', rentalPrice: prevRentPrice, rentalPeriod: prevRentPeriod, isRentable: prevIsRent, listingType: prevListType }]);
                              setPreviewProduct(null);
                              setShowCartDrawer(true);
                            }}
                            className="btn-primary"
                            style={{ padding: '6px 14px', fontSize: '11px' }}
                          >
                            Buy
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCart([...cart, { ...previewProduct, cartMode: 'rent', rentalPrice: prevRentPrice, rentalPeriod: prevRentPeriod, isRentable: prevIsRent, listingType: prevListType }]);
                              setPreviewProduct(null);
                              setShowCartDrawer(true);
                            }}
                            style={{ padding: '6px 14px', fontSize: '11px', borderRadius: '8px', background: 'linear-gradient(135deg, #a855f7, #6366f1)', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Rent
                          </button>
                        </>
                      ) : prevListType === 'rent' ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setCart([...cart, { ...previewProduct, cartMode: 'rent', rentalPrice: prevRentPrice, rentalPeriod: prevRentPeriod, isRentable: prevIsRent, listingType: prevListType }]);
                              setToastMessage(`Added "${previewProduct.title}" rental to bag`);
                              setPreviewProduct(null);
                            }}
                            style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.18)', border: '1px solid rgba(168, 85, 247, 0.35)', color: '#e9d5ff', fontWeight: 600, cursor: 'pointer' }}
                          >
                            + Cart
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCart([...cart, { ...previewProduct, cartMode: 'rent', rentalPrice: prevRentPrice, rentalPeriod: prevRentPeriod, isRentable: prevIsRent, listingType: prevListType }]);
                              setPreviewProduct(null);
                              setShowCartDrawer(true);
                            }}
                            style={{ padding: '6px 16px', fontSize: '12px', borderRadius: '8px', background: 'linear-gradient(135deg, #a855f7, #6366f1)', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                          >
                            Rent Now
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setCart([...cart, { ...previewProduct, cartMode: 'buy', rentalPrice: prevRentPrice, rentalPeriod: prevRentPeriod, isRentable: prevIsRent, listingType: prevListType }]);
                              setToastMessage(`Added "${previewProduct.title}" to bag`);
                              setPreviewProduct(null);
                            }}
                            style={{ padding: '6px 12px', fontSize: '11px', borderRadius: '8px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                          >
                            + Cart
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCart([...cart, { ...previewProduct, cartMode: 'buy', rentalPrice: prevRentPrice, rentalPeriod: prevRentPeriod, isRentable: prevIsRent, listingType: prevListType }]);
                              setPreviewProduct(null);
                              setShowCartDrawer(true);
                            }}
                            className="btn-primary"
                            style={{ padding: '6px 16px', fontSize: '12px' }}
                          >
                            Buy
                          </button>
                        </>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Slide-out Cart & Checkout Drawer */}
      {showCartDrawer && (
        <div className="lightbox-backdrop" onClick={() => setShowCartDrawer(false)}>
          <div
            className="lightbox-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '480px', maxHeight: '90vh', background: '#090d16', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', padding: '20px', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={18} color="#6366f1" />
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Your Shopping Bag ({cart.length})</h3>
              </div>
              <button
                onClick={() => setShowCartDrawer(false)}
                style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', borderRadius: '8px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={15} />
              </button>
            </div>

            {orderConfirmed ? (
              <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                <CheckCircle size={44} color="#10b981" style={{ margin: '0 auto 12px' }} />
                <h4 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '6px' }}>Order Confirmed!</h4>
                <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '14px' }}>{orderConfirmed.message}</p>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '10px', borderRadius: '8px', fontSize: '12px', fontFamily: 'monospace', color: '#34d399', marginBottom: '18px' }}>
                  Order ID: {orderConfirmed.id}
                </div>
                <button
                  onClick={() => { setOrderConfirmed(null); setShowCartDrawer(false); }}
                  className="btn-primary"
                  style={{ width: '100%', padding: '10px' }}
                >
                  Back to Store
                </button>
              </div>
            ) : cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 0', color: '#94a3b8' }}>
                <ShoppingBag size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                <p style={{ fontSize: '14px', fontWeight: 600 }}>Your bag is currently empty.</p>
                <button
                  onClick={() => setShowCartDrawer(false)}
                  className="btn-primary"
                  style={{ marginTop: '14px', fontSize: '12px', padding: '8px 16px' }}
                >
                  Browse Products
                </button>
              </div>
            ) : (
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', marginBottom: '14px' }}>
                  {cart.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ minWidth: 0, flex: 1, paddingRight: '8px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
                        <span style={{ fontSize: '10px', color: item.cartMode === 'rent' ? '#c084fc' : '#38bdf8' }}>
                          {item.cartMode === 'rent' ? '⏱️ Rental' : '📦 Purchase'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#fff' }}>
                          ₹{item.cartMode === 'rent' && (item.rentalPrice || item.rental_price) ? (item.rentalPrice || item.rental_price) : item.price}
                        </span>
                        <button
                          onClick={() => setCart(cart.filter((_, i) => i !== idx))}
                          style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px' }}
                          title="Remove item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.08)', marginBottom: '14px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#94a3b8' }}>Total</span>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: '#10b981' }}>₹{cartTotal.toFixed(2)}</span>
                </div>

                {/* Checkout Form calling FastAPI */}
                <form onSubmit={handlePlaceOrder} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    type="text"
                    required
                    placeholder="Full Name *"
                    value={customerForm.name}
                    onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                    style={{ padding: '9px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px' }}
                  />
                  <input
                    type="email"
                    required
                    placeholder="Email Address *"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                    style={{ padding: '9px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px' }}
                  />
                  <input
                    type="tel"
                    placeholder="Phone Number (Optional)"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                    style={{ padding: '9px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px' }}
                  />
                  <textarea
                    rows={2}
                    placeholder="Shipping Address (Optional)"
                    value={customerForm.address}
                    onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                    style={{ padding: '9px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '12px', resize: 'none' }}
                  />
                  <button
                    type="submit"
                    disabled={orderSubmitting}
                    className="btn-primary"
                    style={{ padding: '11px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '4px' }}
                  >
                    {orderSubmitting ? 'Submitting to FastAPI Backend...' : (
                      <>
                        <Send size={14} />
                        <span>Place Order · ₹{cartTotal.toFixed(2)}</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1100, background: 'rgba(15, 23, 42, 0.96)', border: '1px solid rgba(255, 255, 255, 0.18)', borderRadius: '10px', padding: '10px 16px', color: '#fff', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 12px 30px rgba(0,0,0,0.6)' }}>
          <CheckCircle size={15} color="#10b981" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
