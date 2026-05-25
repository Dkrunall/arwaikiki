'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Cocktail } from '@/types/cocktail';
import { Loader2, Plus, X, Upload, Check } from 'lucide-react';

interface AdminFormProps {
  initialData?: Cocktail | null;
  onSave: () => void;
  onCancel?: () => void;
}

export default function AdminForm({ initialData, onSave, onCancel }: AdminFormProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'Signature' | 'Classic' | 'Mocktail' | 'Special'>('Signature');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [ingredientsText, setIngredientsText] = useState('');
  const [cardColor, setCardColor] = useState('#c29a53');
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setCategory(initialData.category);
      setDescription(initialData.description);
      setPrice(initialData.price.toString());
      setIngredientsText(
        Array.isArray(initialData.ingredients)
          ? initialData.ingredients.join(', ')
          : String(initialData.ingredients)
      );
      setCardColor(initialData.card_color || '#c29a53');
      setIsActive(initialData.is_active);
      setImageUrl(initialData.image_url || '');
      setVideoUrl(initialData.video_url || '');
    } else {
      resetForm();
    }
  }, [initialData]);

  const resetForm = () => {
    setName('');
    setCategory('Signature');
    setDescription('');
    setPrice('');
    setIngredientsText('');
    setCardColor('#c29a53');
    setIsActive(true);
    setImageFile(null);
    setImageUrl('');
    setVideoFile(null);
    setVideoUrl('');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'image/png') {
        setErrorMsg('Only transparent background PNG images are recommended.');
        return;
      }
      setImageFile(file);
      setErrorMsg('');
    }
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('video/')) {
        setErrorMsg('Please select a valid video file (MP4 recommended).');
        return;
      }
      setVideoFile(file);
      setErrorMsg('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Basic validation
      if (!name || !price) {
        throw new Error('Name and price are required.');
      }

      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      if (!slug) {
        throw new Error('Invalid cocktail name (could not generate slug).');
      }

      let finalImageUrl = imageUrl;
      let finalVideoUrl = videoUrl;

      // 2. Upload image to Supabase Storage if a new file is chosen
      if (imageFile) {
        setUploading(true);
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${slug}-${Date.now()}.${fileExt}`;
        const filePath = `public/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('cocktail-images')
          .upload(filePath, imageFile, { cacheControl: '3600', upsert: true });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('cocktail-images').getPublicUrl(filePath);
        finalImageUrl = data.publicUrl;
        setUploading(false);
      }

      // 3. Upload video to Supabase Storage if a new file is chosen
      if (videoFile) {
        setUploadingVideo(true);
        const fileExt = videoFile.name.split('.').pop();
        const fileName = `${slug}-${Date.now()}.${fileExt}`;
        const filePath = `public/${fileName}`;

        const { error: videoUploadError } = await supabase.storage
          .from('cocktail-videos')
          .upload(filePath, videoFile, { cacheControl: '3600', upsert: true });

        if (videoUploadError) throw videoUploadError;

        const { data } = supabase.storage.from('cocktail-videos').getPublicUrl(filePath);
        finalVideoUrl = data.publicUrl;
        setUploadingVideo(false);
      }

      // Convert ingredients text to array
      const ingredients = ingredientsText
        .split(',')
        .map((i) => i.trim())
        .filter((i) => i.length > 0);

      const cocktailPayload = {
        name,
        slug,
        category,
        description,
        ingredients,
        price: parseFloat(price),
        image_url: finalImageUrl,
        video_url: finalVideoUrl || null,
        card_color: cardColor,
        is_active: isActive,
      };

      if (initialData?.id) {
        // Update existing cocktail
        const { error: updateError } = await supabase
          .from('cocktails')
          .update(cocktailPayload)
          .eq('id', initialData.id);

        if (updateError) throw updateError;
        setSuccessMsg('Cocktail updated successfully!');
      } else {
        // Insert new cocktail
        const { data: insertData, error: insertError } = await supabase
          .from('cocktails')
          .insert([cocktailPayload])
          .select();

        console.log('Insert result:', { insertData, insertError });
        if (insertError) throw insertError;
        setSuccessMsg('Cocktail added successfully!');
        resetForm();
      }

      // Only close and refresh if we got here without throwing
      setTimeout(() => {
        onSave();
      }, 800);

    } catch (err: any) {
      console.error('Full save error:', err);
      // Build a detailed error message including Supabase-specific fields
      const details = [
        err.message,
        err.code ? `Code: ${err.code}` : null,
        err.hint ? `Hint: ${err.hint}` : null,
        err.details ? `Details: ${err.details}` : null,
      ].filter(Boolean).join(' | ');
      setErrorMsg(details || 'An error occurred while saving.');
    } finally {
      setLoading(false);
      setUploading(false);
      setUploadingVideo(false);
    }
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className="p-8 rounded-3xl glass-premium border border-[var(--brand-maroon)]/15 text-[var(--brand-maroon)] shadow-[0_20px_50px_rgba(81,9,9,0.06)] flex flex-col gap-6 w-full relative overflow-hidden font-sans"
    >
      {/* Decorative ambient glows inside the modal */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#510909]/5 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#c29a53]/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b border-[var(--brand-maroon)]/10 relative z-10">
        <div>
          <h3 className="text-xl font-display font-black tracking-wider text-[var(--brand-maroon)] uppercase">
            {initialData ? 'Edit Cocktail' : 'Add New Cocktail'}
          </h3>
          <p className="text-[9px] text-[var(--brand-maroon)]/60 uppercase tracking-widest mt-0.5">Waikiki Inventory Portal</p>
        </div>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-2 rounded-xl bg-white/40 border border-[var(--brand-maroon)]/10 hover:border-red-500/30 text-[var(--brand-maroon)]/60 hover:text-red-600 hover:bg-red-500/10 transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 text-xs font-bold relative z-10 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-[var(--brand-maroon)]/10 border border-[var(--brand-maroon)]/20 text-[var(--brand-maroon)] text-xs font-bold relative z-10 flex items-center gap-2">
          <Check size={14} className="stroke-[3] shrink-0" />
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 relative z-10">
        {/* Name */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black text-[var(--brand-maroon)]/70 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c29a53]" />
            Cocktail Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Mai Tai"
            className="w-full px-4 py-3 rounded-xl bg-white/40 border border-[var(--brand-maroon)]/10 focus:border-[var(--brand-maroon)] focus:bg-white/60 focus:outline-none transition-all placeholder:text-[var(--brand-maroon)]/35 text-[var(--brand-maroon)] font-medium text-sm"
          />
        </div>

        {/* Category */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black text-[var(--brand-maroon)]/70 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c29a53]" />
            Category
          </label>
          <div className="relative">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full px-4 py-3 rounded-xl bg-white/40 border border-[var(--brand-maroon)]/10 focus:border-[var(--brand-maroon)] focus:outline-none transition-all text-[var(--brand-maroon)] font-medium text-sm appearance-none cursor-pointer pr-10"
            >
              <option value="Signature" className="bg-[#fcefd4] text-[var(--brand-maroon)]">Signature</option>
              <option value="Classic" className="bg-[#fcefd4] text-[var(--brand-maroon)]">Classic</option>
              <option value="Mocktail" className="bg-[#fcefd4] text-[var(--brand-maroon)]">Mocktail</option>
              <option value="Special" className="bg-[#fcefd4] text-[var(--brand-maroon)]">Special</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--brand-maroon)]/60">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Price */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black text-[var(--brand-maroon)]/70 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c29a53]" />
            Price (INR)
          </label>
          <input
            type="number"
            required
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g. 750"
            className="w-full px-4 py-3 rounded-xl bg-white/40 border border-[var(--brand-maroon)]/10 focus:border-[var(--brand-maroon)] focus:bg-white/60 focus:outline-none transition-all placeholder:text-[var(--brand-maroon)]/35 text-[var(--brand-maroon)] font-medium text-sm"
          />
        </div>

        {/* Card Color Accent */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black text-[var(--brand-maroon)]/70 uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c29a53]" />
            Accent Theme Color
          </label>
          <div className="flex gap-3 items-center">
            <div className="relative w-12 h-11.5 rounded-xl overflow-hidden border border-[var(--brand-maroon)]/10 bg-white/40 flex items-center justify-center cursor-pointer hover:border-[var(--brand-maroon)]/30 transition-colors shrink-0">
              <input
                type="color"
                value={cardColor}
                onChange={(e) => setCardColor(e.target.value)}
                className="absolute inset-0 w-full h-full p-0 border-0 opacity-0 cursor-pointer"
              />
              <div className="w-8 h-7.5 rounded-lg shadow-inner" style={{ backgroundColor: cardColor }} />
            </div>
            <input
              type="text"
              value={cardColor}
              onChange={(e) => setCardColor(e.target.value)}
              placeholder="#c29a53"
              className="px-4 py-3 flex-1 rounded-xl bg-white/40 border border-[var(--brand-maroon)]/10 focus:border-[var(--brand-maroon)] focus:outline-none transition-all font-mono text-sm uppercase text-[var(--brand-maroon)]/85"
            />
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="flex flex-col gap-2 relative z-10">
        <label className="text-[10px] font-black text-[var(--brand-maroon)]/70 uppercase tracking-widest flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#c29a53]" />
          Short Description
        </label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the aroma, custom flavor profile, or garnishes..."
          className="w-full px-4 py-3 rounded-xl bg-white/40 border border-[var(--brand-maroon)]/10 focus:border-[var(--brand-maroon)] focus:bg-white/60 focus:outline-none transition-all placeholder:text-[var(--brand-maroon)]/35 text-[var(--brand-maroon)] font-medium text-sm resize-none"
        />
      </div>

      {/* Ingredients */}
      <div className="flex flex-col gap-2 relative z-10">
        <label className="text-[10px] font-black text-[var(--brand-maroon)]/70 uppercase tracking-widest flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#c29a53]" />
          Ingredients (separated by commas)
        </label>
        <input
          type="text"
          value={ingredientsText}
          onChange={(e) => setIngredientsText(e.target.value)}
          placeholder="e.g. White Rum, Lime Juice, Mint Leaves, Sugar, Soda"
          className="w-full px-4 py-3 rounded-xl bg-white/40 border border-[var(--brand-maroon)]/10 focus:border-[var(--brand-maroon)] focus:bg-white/60 focus:outline-none transition-all placeholder:text-[var(--brand-maroon)]/35 text-[var(--brand-maroon)] font-medium text-sm"
        />
      </div>

      {/* Image upload */}
      <div className="flex flex-col gap-2 relative z-10">
        <label className="text-[10px] font-black text-[var(--brand-maroon)]/70 uppercase tracking-widest flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#c29a53]" />
          Cocktail Glass Cutout
        </label>
        <div className="flex items-center gap-5 p-5 rounded-2xl border border-dashed border-[var(--brand-maroon)]/15 bg-white/10 hover:bg-white/20 transition-all">
          <label className="flex flex-col items-center justify-center w-24 h-24 bg-white/20 hover:bg-white/40 border border-[var(--brand-maroon)]/10 hover:border-[var(--brand-maroon)]/30 rounded-xl cursor-pointer transition-all text-[var(--brand-maroon)] shrink-0 group relative overflow-hidden">
            <Upload size={22} className="mb-1 text-[var(--brand-maroon)]/70 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--brand-maroon)]/85">Choose PNG</span>
            <input type="file" accept="image/png" onChange={handleImageChange} className="hidden" />
          </label>
          
          <div className="flex-1 min-w-0">
            {imageFile ? (
              <div>
                <p className="text-xs font-black text-[var(--brand-maroon)] truncate uppercase tracking-wide">{imageFile.name}</p>
                <p className="text-[10px] text-[var(--brand-maroon)]/55 font-mono mt-0.5">{(imageFile.size / 1024).toFixed(1)} KB — Ready to upload</p>
              </div>
            ) : imageUrl ? (
              <div>
                <p className="text-xs text-[var(--brand-maroon)]/70 truncate font-mono">{imageUrl.split('/').pop()}</p>
                <p className="text-[10px] text-[var(--brand-maroon)] font-black uppercase tracking-widest flex items-center gap-1 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-maroon)] animate-pulse" />
                  Image Linked
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-bold text-[var(--brand-maroon)]/60">Drag & drop or click to upload</p>
                <p className="text-[10px] text-[var(--brand-maroon)]/50 mt-1 uppercase tracking-wider">Transparent background PNG is highly recommended</p>
              </div>
            )}
          </div>

          {(imageFile || imageUrl) && (
            <div className="w-20 h-20 bg-white/40 border border-[var(--brand-maroon)]/10 rounded-xl overflow-hidden flex items-center justify-center p-2 relative shadow-inner shrink-0 group">
              <div className="absolute inset-0 bg-[var(--brand-maroon)]/5 opacity-0 group-hover:opacity-100 transition-opacity blur-md" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageFile ? URL.createObjectURL(imageFile) : imageUrl}
                alt="Preview"
                className="w-full h-full object-contain drop-shadow-[0_4px_6px_rgba(81,9,9,0.15)] z-10"
              />
            </div>
          )}
        </div>
      </div>

      {/* Video upload */}
      <div className="flex flex-col gap-2 relative z-10">
        <label className="text-[10px] font-black text-[var(--brand-maroon)]/70 uppercase tracking-widest flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#c29a53]" />
          AR Video (MP4) <span className="text-[var(--brand-maroon)]/40 normal-case font-medium tracking-normal">— optional, shown on AR card</span>
        </label>
        <div className="flex items-center gap-5 p-5 rounded-2xl border border-dashed border-[var(--brand-maroon)]/15 bg-white/10 hover:bg-white/20 transition-all">
          <label className="flex flex-col items-center justify-center w-24 h-24 bg-white/20 hover:bg-white/40 border border-[var(--brand-maroon)]/10 hover:border-[var(--brand-maroon)]/30 rounded-xl cursor-pointer transition-all text-[var(--brand-maroon)] shrink-0 group">
            <Upload size={22} className="mb-1 text-[var(--brand-maroon)]/70 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--brand-maroon)]/85">Choose MP4</span>
            <input type="file" accept="video/mp4,video/*" onChange={handleVideoChange} className="hidden" />
          </label>

          <div className="flex-1 min-w-0">
            {uploadingVideo ? (
              <div className="flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-[var(--brand-maroon)]" />
                <span className="text-xs font-black text-[var(--brand-maroon)] uppercase tracking-wider">Uploading video…</span>
              </div>
            ) : videoFile ? (
              <div>
                <p className="text-xs font-black text-[var(--brand-maroon)] truncate uppercase tracking-wide">{videoFile.name}</p>
                <p className="text-[10px] text-[var(--brand-maroon)]/55 font-mono mt-0.5">{(videoFile.size / (1024 * 1024)).toFixed(1)} MB — Ready to upload</p>
              </div>
            ) : videoUrl ? (
              <div>
                <p className="text-xs text-[var(--brand-maroon)]/70 truncate font-mono">{videoUrl.split('/').pop()}</p>
                <p className="text-[10px] text-[var(--brand-maroon)] font-black uppercase tracking-widest flex items-center gap-1 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-maroon)] animate-pulse" />
                  Video Linked
                </p>
                <button type="button" onClick={() => setVideoUrl('')} className="text-[10px] text-red-500 font-black uppercase tracking-wider mt-1 hover:underline">
                  Remove
                </button>
              </div>
            ) : (
              <div>
                <p className="text-xs font-bold text-[var(--brand-maroon)]/60">Upload an MP4 to show on the AR card</p>
                <p className="text-[10px] text-[var(--brand-maroon)]/50 mt-1 uppercase tracking-wider">Recommended: portrait, under 20 MB</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Switch active toggle */}
      <div className="flex items-center justify-between p-4.5 rounded-2xl bg-white/20 border border-[var(--brand-maroon)]/10 w-full relative z-10 mt-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-bold text-[var(--brand-maroon)] uppercase tracking-wider">Active Status</span>
          <span className="text-[10px] text-[var(--brand-maroon)]/55">Visible in the public AR Menu catalog</span>
        </div>
        <button
          type="button"
          onClick={() => setIsActive(!isActive)}
          className={`relative inline-flex h-6.5 w-12 items-center rounded-full transition-all duration-300 focus:outline-none cursor-pointer ${
            isActive ? 'bg-[var(--brand-maroon)] shadow-[0_0_12px_rgba(81,9,9,0.25)]' : 'bg-black/10'
          }`}
        >
          <span
            className={`inline-block h-4.5 w-4.5 transform rounded-full transition-transform duration-300 ${
              isActive ? 'translate-x-6 bg-[#fcefd4]' : 'translate-x-1.5 bg-white'
            }`}
          />
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end items-center gap-4 pt-4 border-t border-[var(--brand-maroon)]/10 relative z-10 mt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3.5 rounded-xl border border-[var(--brand-maroon)]/10 text-[var(--brand-maroon)]/60 hover:text-[var(--brand-maroon)] hover:bg-[var(--brand-maroon)]/5 text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading || uploading || uploadingVideo}
          className="px-6 py-3.5 rounded-xl bg-[var(--brand-maroon)] text-[#fcefd4] hover:bg-[#6c1010] font-black uppercase tracking-widest text-xs active:scale-98 transition-all flex items-center justify-center gap-2.5 shadow-lg shadow-[var(--brand-maroon)]/15 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading || uploading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <span>{initialData ? 'Save Changes' : 'Create Cocktail'}</span>
              <Check size={14} className="stroke-[3]" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
