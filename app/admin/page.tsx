'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Cocktail } from '@/types/cocktail';
import AdminForm from '@/components/AdminForm';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Plus, Edit, Trash2, Download, ToggleLeft, ToggleRight, 
  Lock, ArrowRight, Eye, RefreshCw, BarChart2, EyeOff, LogOut, Loader2, Sparkles, Database
} from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null); // null = checking
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [cocktails, setCocktails] = useState<Cocktail[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingCocktail, setEditingCocktail] = useState<Cocktail | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Stats
  const totalCocktails = cocktails.length;
  const activeCocktails = cocktails.filter(c => c.is_active).length;

  useEffect(() => {
    fetch('/api/admin/check')
      .then(r => r.ok ? setIsAuthorized(true) : setIsAuthorized(false))
      .catch(() => setIsAuthorized(false));
  }, []);

  useEffect(() => {
    if (isAuthorized) {
      fetchCocktails();
    }
  }, [isAuthorized]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setIsAuthorized(true);
        setPassword('');
      } else {
        setAuthError('Incorrect admin password. Please try again.');
      }
    } catch {
      setAuthError('Network error. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setIsAuthorized(false);
    setPassword('');
  };

  const fetchCocktails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('cocktails')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCocktails(data || []);
    } catch (err: any) {
      console.error('Error fetching cocktails:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (cocktail: Cocktail) => {
    try {
      const { error } = await supabase
        .from('cocktails')
        .update({ is_active: !cocktail.is_active })
        .eq('id', cocktail.id);

      if (error) throw error;
      
      setCocktails(prev => 
        prev.map(c => c.id === cocktail.id ? { ...c, is_active: !c.is_active } : c)
      );
    } catch (err: any) {
      alert('Failed to update status: ' + err.message);
    }
  };

  const handleDelete = async (cocktail: Cocktail) => {
    if (!confirm(`Are you sure you want to delete "${cocktail.name}"?`)) return;

    try {
      if (cocktail.image_url) {
        const parts = cocktail.image_url.split('/');
        const fileName = parts[parts.length - 1];
        const filePath = `public/${fileName}`;
        
        await supabase.storage.from('cocktail-images').remove([filePath]);
      }

      const { error } = await supabase
        .from('cocktails')
        .delete()
        .eq('id', cocktail.id);

      if (error) throw error;

      setCocktails(prev => prev.filter(c => c.id !== cocktail.id));
    } catch (err: any) {
      alert('Delete failed: ' + err.message);
    }
  };

  const downloadRowQR = (slug: string, name: string) => {
    const qrSvg = document.getElementById(`qr-svg-${slug}`);
    if (!qrSvg) return;
    const svgString = new XMLSerializer().serializeToString(qrSvg);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const trigger = document.createElement('a');
    trigger.href = svgUrl;
    trigger.download = `qr-${slug}.svg`;
    document.body.appendChild(trigger);
    trigger.click();
    document.body.removeChild(trigger);
  };

  if (isAuthorized === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--background)]">
        <Loader2 size={32} className="animate-spin text-[var(--brand-maroon)]" />
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--background)] p-6 text-[var(--foreground)] relative overflow-hidden font-sans">
        {/* Ambient background graphics */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-[#510909]/8 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-[#c29a53]/6 rounded-full blur-[150px] pointer-events-none" />

        <div className="w-full max-w-md p-8 rounded-3xl glass-premium flex flex-col items-center z-10 border border-[var(--brand-maroon)]/15 shadow-[0_20px_50px_rgba(81,9,9,0.06)]">
          <div className="w-16 h-16 rounded-2xl bg-[var(--brand-maroon)]/5 border border-[var(--brand-maroon)]/15 flex items-center justify-center mb-6 shadow-inner">
            <Lock size={26} className="text-[var(--brand-maroon)] animate-pulse" />
          </div>
          <h2 className="text-2xl font-display font-black tracking-widest text-center text-[var(--brand-maroon)] mb-1">WAIKIKI</h2>
          <p className="text-[10px] text-[var(--brand-maroon)]/60 text-center uppercase tracking-[0.2em] mb-8 font-black">Admin Panel Authenticator</p>
          
          <form onSubmit={handleLogin} className="w-full flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-black text-[var(--brand-maroon)]/70 uppercase tracking-wider">Gateway Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full px-5 py-3.5 rounded-2xl bg-white/40 border border-[var(--brand-maroon)]/15 focus:border-[var(--brand-maroon)] focus:bg-white/60 focus:outline-none transition-all placeholder:text-[var(--brand-maroon)]/35 text-center font-bold tracking-widest text-[var(--brand-maroon)]"
              />
            </div>
            {authError && (
              <p className="text-xs text-red-600 text-center font-bold">{authError}</p>
            )}
            <button
              type="submit"
              disabled={authLoading}
              className="w-full mt-2 py-4 rounded-2xl bg-[var(--brand-maroon)] text-[#fcefd4] font-black uppercase tracking-wider hover:bg-[#6c1010] active:scale-98 transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-[var(--brand-maroon)]/15 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {authLoading ? <Loader2 size={16} className="animate-spin" /> : <><span>Unlock Gateway</span><ArrowRight size={16} className="stroke-[2.5]" /></>}
            </button>
          </form>
          <Link href="/" className="mt-8 text-xs text-[var(--brand-maroon)]/60 hover:text-[var(--brand-maroon)] transition-colors uppercase font-black tracking-wider">
            Back to Public Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-6 lg:p-12 relative overflow-hidden font-sans">
      {/* Background ambient decorative glows */}
      <div className="absolute top-[-10%] left-[-15%] w-[50%] h-[50%] bg-[#510909]/8 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-15%] w-[50%] h-[50%] bg-[#c29a53]/6 rounded-full blur-[150px] pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-[var(--brand-maroon)]/10 mb-10 z-10 relative">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span className="text-2xl">🌊</span>
            <h1 className="text-3xl font-display font-black text-[var(--brand-maroon)] tracking-wider uppercase">Waikiki Manager</h1>
          </div>
          <p className="text-xs text-[var(--brand-maroon)]/85 font-black uppercase tracking-[0.2em]">Menu & WebAR Content Administrator</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => {
              setEditingCocktail(null);
              setShowForm(true);
            }}
            className="flex-1 md:flex-none px-6 py-3.5 rounded-2xl bg-[var(--brand-maroon)] text-[#fcefd4] hover:bg-[#6c1010] active:scale-98 font-black uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--brand-maroon)]/15 cursor-pointer"
          >
            <Plus size={16} className="stroke-[2.5]" />
            <span>Create Cocktail</span>
          </button>
          <button
            onClick={handleLogout}
            className="p-3.5 rounded-2xl bg-white/40 border border-[var(--brand-maroon)]/10 hover:border-red-500/30 text-[var(--brand-maroon)]/60 hover:text-red-600 transition-all flex items-center justify-center cursor-pointer"
            title="Log Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10 z-10 relative">
        <div className="p-6 rounded-2xl glass flex items-center justify-between border border-[var(--brand-maroon)]/10 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#c29a53] opacity-40" />
          <div>
            <p className="text-[10px] font-black text-[var(--brand-maroon)]/50 uppercase tracking-widest">Total Cocktails</p>
            <h3 className="text-3xl font-display font-black text-[var(--brand-maroon)] mt-1.5">{totalCocktails}</h3>
          </div>
          <div className="w-12 h-12 bg-[#c29a53]/5 border border-[#c29a53]/15 rounded-xl flex items-center justify-center text-[#c29a53]">
            <Database size={20} />
          </div>
        </div>

        <div className="p-6 rounded-2xl glass flex items-center justify-between border border-[var(--brand-maroon)]/10 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#510909] opacity-40" />
          <div>
            <p className="text-[10px] font-black text-[var(--brand-maroon)]/50 uppercase tracking-widest">Active Menu</p>
            <h3 className="text-3xl font-display font-black text-[var(--brand-maroon)] mt-1.5">{activeCocktails}</h3>
          </div>
          <div className="w-12 h-12 bg-[#510909]/5 border border-[#510909]/15 rounded-xl flex items-center justify-center text-[#510909]">
            <Eye size={20} />
          </div>
        </div>

        <div className="p-6 rounded-2xl glass flex items-center justify-between border border-[var(--brand-maroon)]/10 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-[var(--brand-maroon)]/35 opacity-40" />
          <div>
            <p className="text-[10px] font-black text-[var(--brand-maroon)]/50 uppercase tracking-widest">Inactive (Draft)</p>
            <h3 className="text-3xl font-display font-black text-[var(--brand-maroon)]/60 mt-1.5">{totalCocktails - activeCocktails}</h3>
          </div>
          <div className="w-12 h-12 bg-[var(--brand-maroon)]/5 border border-[var(--brand-maroon)]/15 rounded-xl flex items-center justify-center text-[var(--brand-maroon)]/60">
            <EyeOff size={20} />
          </div>
        </div>
      </div>

      {/* Form Overlay Modal Panel */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-[#510909]/45 backdrop-blur-md flex justify-center items-center p-4 overflow-y-auto animate-[fadeIn_0.2s_ease-out]">
          <div className="w-full max-w-2xl my-8">
            <AdminForm
              initialData={editingCocktail}
              onSave={() => {
                setShowForm(false);
                setEditingCocktail(null);
                fetchCocktails();
              }}
              onCancel={() => {
                setShowForm(false);
                setEditingCocktail(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Cocktails list */}
      <div className="rounded-3xl glass-premium shadow-2xl overflow-hidden border border-[var(--brand-maroon)]/10 z-10 relative">
        <div className="p-6 border-b border-[var(--brand-maroon)]/10 flex justify-between items-center bg-white/20">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[var(--brand-maroon)]" />
            <h2 className="font-display font-black tracking-wider uppercase text-[var(--brand-maroon)]">Cocktail Inventory</h2>
          </div>
          <button 
            onClick={fetchCocktails}
            className="p-2 rounded-xl bg-white/40 border border-[var(--brand-maroon)]/10 text-[var(--brand-maroon)]/60 hover:text-[var(--brand-maroon)] transition-colors cursor-pointer"
            title="Refresh List"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {loading ? (
          <div className="p-20 text-center text-gray-500 flex flex-col items-center gap-3">
            <Loader2 size={32} className="animate-spin text-[var(--brand-maroon)]" />
            <p className="text-xs font-black uppercase tracking-widest text-[var(--brand-maroon)]/60">Loading catalog...</p>
          </div>
        ) : cocktails.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center">
            <p className="text-[var(--brand-maroon)]/70 mb-6 font-medium">Your database is empty. Add your first cocktail card!</p>
            <button
              onClick={() => {
                setShowForm(true);
              }}
              className="px-6 py-3 border border-[var(--brand-maroon)] text-[var(--brand-maroon)] hover:bg-[var(--brand-maroon)] hover:text-[#fcefd4] rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              Add your first cocktail
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--brand-maroon)]/10 text-[10px] font-black uppercase text-[var(--brand-maroon)]/65 tracking-wider bg-white/20">
                  <th className="py-4 px-6">Image</th>
                  <th className="py-4 px-6">Name & Category</th>
                  <th className="py-4 px-6">Price</th>
                  <th className="py-4 px-6">Active</th>
                  <th className="py-4 px-6">AR QR code</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--brand-maroon)]/5 text-sm">
                {cocktails.map((cocktail) => {
                  const arUrl = typeof window !== 'undefined' ? `${window.location.origin}/ar/${cocktail.slug}` : '';
                  const accentColor = cocktail.card_color || '#c29a53';
                  
                  return (
                    <tr key={cocktail.id} className="hover:bg-white/20 transition-colors">
                      {/* Image */}
                      <td className="py-5 px-6">
                        <div className="w-14 h-14 bg-white/40 rounded-xl overflow-hidden border border-[var(--brand-maroon)]/10 flex items-center justify-center p-2 relative shadow-inner">
                          <div className="absolute inset-0 opacity-10 blur-md" style={{ backgroundColor: accentColor }} />
                          {cocktail.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={cocktail.image_url}
                              alt={cocktail.name}
                              className="w-full h-full object-contain drop-shadow-[0_4px_6px_rgba(81,9,9,0.2)] z-10"
                            />
                          ) : (
                            <span className="text-[9px] text-[var(--brand-maroon)]/40 font-bold uppercase tracking-wider z-10 font-mono">None</span>
                          )}
                        </div>
                      </td>
 
                      {/* Name / Category */}
                      <td className="py-5 px-6">
                        <p className="font-black text-[var(--brand-maroon)] uppercase tracking-wider text-base">{cocktail.name}</p>
                        <span 
                          className="inline-block mt-1 px-2.5 py-0.5 text-[9px] font-black rounded-md uppercase tracking-wider"
                          style={{
                            backgroundColor: `${accentColor}15`,
                            color: accentColor === '#510909' ? '#510909' : accentColor,
                            border: `1px solid ${accentColor}30`
                          }}
                        >
                          {cocktail.category}
                        </span>
                      </td>
 
                      {/* Price */}
                      <td className="py-5 px-6 font-bold text-[var(--brand-maroon)]">
                        Rs. {cocktail.price}
                      </td>
 
                      {/* Toggle Active Badge */}
                      <td className="py-5 px-6">
                        <button
                          onClick={() => handleToggleActive(cocktail)}
                          className="group flex items-center gap-2 px-3 py-1.5 rounded-full border bg-white/30 hover:bg-white/50 transition-all cursor-pointer"
                          style={{
                            borderColor: cocktail.is_active ? 'rgba(81, 9, 9, 0.2)' : 'rgba(81, 9, 9, 0.05)'
                          }}
                          title={cocktail.is_active ? 'Deactivate' : 'Activate'}
                        >
                          <span className={`w-2 h-2 rounded-full ${cocktail.is_active ? 'bg-[#510909] animate-pulse' : 'bg-gray-400'}`} />
                          <span className={`text-[10px] font-black uppercase tracking-wider ${cocktail.is_active ? 'text-[#510909]' : 'text-gray-500'}`}>
                            {cocktail.is_active ? 'Visible' : 'Hidden'}
                          </span>
                        </button>
                      </td>
 
                      {/* AR QR Code download */}
                      <td className="py-5 px-6">
                        {arUrl ? (
                          <div className="flex items-center gap-3">
                            <div className="hidden">
                              <QRCodeSVG
                                id={`qr-svg-${cocktail.slug}`}
                                value={arUrl}
                                size={128}
                                level="H"
                                includeMargin={true}
                              />
                            </div>
                            <div className="bg-white p-1.5 rounded-xl flex items-center justify-center shadow-lg transition-transform duration-300 hover:scale-105">
                              <QRCodeSVG
                                value={arUrl}
                                size={40}
                                level="L"
                              />
                            </div>
                            <button
                              onClick={() => downloadRowQR(cocktail.slug, cocktail.name)}
                              className="p-2.5 rounded-xl bg-white/40 hover:bg-[var(--brand-maroon)]/10 border border-[var(--brand-maroon)]/10 hover:border-[var(--brand-maroon)]/30 text-[var(--brand-maroon)] transition-all cursor-pointer flex items-center justify-center"
                              title="Download QR SVG"
                            >
                              <Download size={14} className="stroke-[2.5]" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 font-bold uppercase">Pending</span>
                        )}
                      </td>
 
                      {/* Actions */}
                      <td className="py-5 px-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingCocktail(cocktail);
                              setShowForm(true);
                            }}
                            className="p-2.5 rounded-xl bg-white/40 border border-[var(--brand-maroon)]/10 hover:border-[var(--brand-maroon)]/30 hover:bg-[var(--brand-maroon)]/10 text-[var(--brand-maroon)]/60 hover:text-[var(--brand-maroon)] transition-all cursor-pointer flex items-center justify-center"
                            title="Edit Recipe"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(cocktail)}
                            className="p-2.5 rounded-xl bg-white/40 border border-[var(--brand-maroon)]/10 hover:border-red-500/30 hover:bg-red-500/10 text-[var(--brand-maroon)]/60 hover:text-red-500 transition-all cursor-pointer flex items-center justify-center"
                            title="Delete Cocktail"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Return footer */}
      <div className="mt-8 text-center">
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-[var(--brand-maroon)]/60 hover:text-[var(--brand-maroon)] transition-colors uppercase font-black tracking-wider">
          <span>Go back to the Waikiki Gallery</span>
          <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}
