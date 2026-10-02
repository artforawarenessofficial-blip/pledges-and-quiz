"use client";
import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Area } from 'react-easy-crop';
import { Pledge, PledgeCommitment } from '@prisma/client';
import { PledgePosterCanvas } from './PledgePosterCanvas';
import type { CertConfig } from './PledgePosterCanvas';
import { downloadPoster, sharePoster } from '@/utils/downloadPoster';
import { Check, Loader2, Camera, ArrowLeft, Edit2, X, RefreshCw } from 'lucide-react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/utils/cropImage';
import { downscaleImage } from '@/utils/downscaleImage';
import { isCertificateOnly } from '@/lib/pledgeMode';

type PledgeWithCommitments = Pledge & { commitments: PledgeCommitment[] };
type PledgeStep = 'details' | 'preview' | 'commitments' | 'success';

function parseCert(raw: string | null | undefined): CertConfig | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(raw) as CertConfig;
    if (c && (c.name || c.photo || (c.images && c.images.length))) return c;
  } catch { /* ignore malformed */ }
  return null;
}

// Admin-defined custom layout wins over baked-in slug layouts.
function getPledgeLayout(pledge: PledgeWithCommitments): string {
  if (parseCert(pledge.certConfig)) return 'custom';
  const slug = pledge.slug;
  if (slug.startsWith('water-')) return 'water';
  if (slug === 'house-sparrow') return 'sparrow';
  if (slug === 'wooden-earbuds') return 'earbuds';
  if (slug === 'jungle-adventure-2026') return 'jungle';
  return 'default';
}

interface UserData {
  fullName: string;
  whatsapp: string;
  email: string;
  photoUrl: string | null;
  agreed: boolean;
  consent: boolean;
}

export function PledgeFlow({ pledge, orgId }: { pledge: PledgeWithCommitments; orgId?: string }) {
  const [currentStep, setCurrentStep]         = useState<PledgeStep>('details');
  const [isTransitioning, setIsTransitioning] = useState(false);
  // Consent boxes (privacy + marketing opt-in) start ticked. Commitments do NOT —
  // pledging itself is the deliberate act, so the user ticks those.
  const [userData, setUserData]               = useState<UserData>({ fullName: '', whatsapp: '', email: '', photoUrl: null, agreed: true, consent: true });

  const hasCommitments = pledge.commitments.length > 0;

  const goToStep = (step: PledgeStep) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentStep(step);
      window.scrollTo(0, 0);
      setTimeout(() => setIsTransitioning(false), 50);
    }, 150);
  };

  const submitAndContinue = async () => {
    try {
      await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pledgeId: pledge.id,
          userName: userData.fullName,
          userEmail: userData.email,
          whatsapp: userData.whatsapp,
          agreed: userData.agreed,
          ...(orgId && { orgId }),
        }),
      });
    } catch (e) {
      console.error('[PledgeFlow] direct submit failed', e);
    }
    goToStep('success');
  };

  return (
    <div className="min-h-screen relative bg-[#f8fafc]">
      <main className={`relative z-10 max-w-2xl mx-auto px-4 py-12 transition-opacity duration-300 ease-in-out ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        
        {currentStep === 'details' && (
          <PledgeDetails 
            pledge={pledge}
            userData={userData}
            onChange={(d) => setUserData({...userData, ...d})}
            onNext={() => goToStep('preview')} 
          />
        )}

        {currentStep === 'preview' && (
          <PledgePreview
            pledge={pledge}
            userData={userData}
            onBack={() => goToStep('details')}
            onConfirm={() => hasCommitments ? goToStep('commitments') : submitAndContinue()}
          />
        )}

        {currentStep === 'commitments' && hasCommitments && (
          <PledgeCommitments
            pledge={pledge}
            userData={userData}
            orgId={orgId}
            onBack={() => goToStep('preview')}
            onSuccess={() => goToStep('success')}
          />
        )}

        {currentStep === 'success' && (
          <PledgeSuccess 
            pledge={pledge} 
            userData={userData} 
            onReturnHome={() => window.location.href = '/'}
          />
        )}
      </main>
    </div>
  );
}

// -------------------------------------------------------------
// Photo Crop Modal Component
// -------------------------------------------------------------
function PhotoCropModal({ 
  imageSrc, 
  onClose, 
  onCropSave 
}: { 
  imageSrc: string; 
  onClose: () => void; 
  onCropSave: (croppedImage: string) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (croppedImage) onCropSave(croppedImage);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white rounded-[1.5rem] w-full max-w-md overflow-hidden flex flex-col items-stretch">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white z-10">
          <h3 className="font-bold text-[#1e1b4b] flex items-center gap-2">
            <Edit2 className="w-4 h-4 text-[#f97316]"/> Adjust Photo
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="relative w-full h-[300px] sm:h-[400px] bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>

        <div className="p-4 bg-white flex justify-end gap-3 border-t border-gray-100">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-gray-600 font-bold hover:bg-gray-100 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="px-5 py-2.5 rounded-xl bg-[#1e1b4b] text-white font-bold hover:bg-[#312e81] shadow-md transition-colors">
            Save Photo
          </button>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Camera Modal — uses getUserMedia for reliable cross-browser camera
// -------------------------------------------------------------
function CameraModal({ onCapture, onClose }: { onCapture: (src: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream]       = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function start() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        if (!active) { s.getTracks().forEach(t => t.stop()); return; }
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch {
        setError('Camera access denied. Please allow camera permissions in your browser settings.');
      }
    }
    start();
    return () => { active = false; stream?.getTracks().forEach(t => t.stop()); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const stopAndClose = () => { stream?.getTracks().forEach(t => t.stop()); onClose(); };

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    stream?.getTracks().forEach(t => t.stop());
    onCapture(canvas.toDataURL('image/png'));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
      <div className="relative w-full h-full max-w-2xl max-h-screen flex flex-col bg-black">
        {/* Close button */}
        <button
          onClick={stopAndClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/60 border border-white/20 flex items-center justify-center text-white"
        >
          <X className="w-5 h-5" />
        </button>

        {error ? (
          <div className="flex-1 flex flex-col items-center justify-center text-white text-center p-8 gap-6">
            <Camera className="w-12 h-12 text-gray-500" />
            <p className="text-lg font-medium">{error}</p>
            <button onClick={stopAndClose} className="px-6 py-3 bg-white text-black rounded-xl font-bold">Close</button>
          </div>
        ) : (
          <>
            {/* Video — fills available space but never pushes controls off screen */}
            <div className="flex-1 overflow-hidden">
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            </div>

            {/* Controls — always visible at bottom */}
            <div className="flex-shrink-0 px-8 py-6 flex justify-between items-center bg-black">
              {/* Flip */}
              <button
                onClick={() => setFacingMode(f => f === 'user' ? 'environment' : 'user')}
                className="w-12 h-12 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
              </button>

              {/* Shutter */}
              <button
                onClick={capture}
                className="w-20 h-20 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                style={{ background: 'white', boxShadow: '0 0 0 5px rgba(255,255,255,0.25), 0 0 0 10px rgba(255,255,255,0.08)' }}
              >
                <div className="w-15 h-15 w-[60px] h-[60px] rounded-full bg-white border-[3px] border-black" />
              </button>

              {/* Balance spacer */}
              <div className="w-12 h-12" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Step 1: User Details (Form + Photo)
// -------------------------------------------------------------
function PledgeDetails({ userData, onChange, onNext, pledge }: { userData: UserData, onChange: (d: Partial<UserData>) => void, onNext: () => void, pledge: PledgeWithCommitments }) {
  const galleryRef                  = useRef<HTMLInputElement>(null);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [showCamera, setShowCamera]   = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsProcessingPhoto(true);
    try {
      const dataUrl = await downscaleImage(file);
      setRawImageSrc(dataUrl);
    } catch (err) {
      console.error('[Photo] downscale failed', err);
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const handleCropSave = (croppedImage: string) => {
    onChange({ photoUrl: croppedImage });
    setRawImageSrc(null);
  };

  const emailOk = !pledge.collectEmail || (userData.email.includes('@') && userData.email.includes('.'));
  const phoneOk = !pledge.collectPhone || userData.whatsapp.length > 5;
  const isValid = userData.photoUrl !== null && userData.fullName.length > 2 && emailOk && phoneOk && userData.consent;

  return (
    <>
      {showCamera && (
        <CameraModal
          onCapture={(src) => { setShowCamera(false); setRawImageSrc(src); }}
          onClose={() => setShowCamera(false)}
        />
      )}
      {isProcessingPhoto && !rawImageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-2xl px-6 py-5 flex items-center gap-3 shadow-xl">
            <Loader2 className="w-5 h-5 animate-spin text-[#1e1b4b]"/>
            <span className="font-semibold text-[#1e1b4b]">Preparing photo…</span>
          </div>
        </div>
      )}
      {rawImageSrc && (
        <PhotoCropModal
          imageSrc={rawImageSrc}
          onClose={() => setRawImageSrc(null)}
          onCropSave={handleCropSave}
        />
      )}

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 md:p-12 text-center">
        <div className="inline-block px-4 py-1.5 rounded-full bg-orange-50 text-[#f97316] font-bold text-[10px] uppercase tracking-widest mb-4">
          {pledge.name.toUpperCase()}
        </div>
        <h2 className="text-3xl font-extrabold text-[#111827] mb-12 tracking-tight">Enter Details</h2>
        
        {/* Photo Upload Area */}
        <div className="flex flex-col items-center mb-10">
          <div
            onClick={() => galleryRef.current?.click()}
            className="w-28 h-28 rounded-full bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors relative overflow-hidden group"
          >
            {userData.photoUrl ? (
              <img src={userData.photoUrl} className="w-full h-full object-cover" alt="User" />
            ) : (
              <Camera className="w-8 h-8 text-gray-300 group-hover:text-gray-400 transition-colors" />
            )}
            <div className="absolute right-0 bottom-0 w-8 h-8 bg-[#1e1b4b] rounded-full flex items-center justify-center border-2 border-white shadow-sm">
              <Edit2 className="w-4 h-4 text-white" />
            </div>
          </div>

          {/* Gallery input */}
          <input ref={galleryRef} type="file" accept="image/*" style={{ position: 'absolute', width: 0, height: 0, opacity: 0, overflow: 'hidden' }} onChange={handleFileChange} />

          <div className="flex gap-4 mt-6 text-[10px] font-bold text-[#1e1b4b] uppercase tracking-widest">
            <button type="button" onClick={() => galleryRef.current?.click()} className="hover:text-[#f97316] transition-colors">UPLOAD PHOTO</button>
            <div className="w-[1px] h-3 bg-gray-300" />
            <button type="button" onClick={() => setShowCamera(true)} className="hover:text-[#f97316] transition-colors">USE CAMERA</button>
          </div>
          <p className="text-[10px] text-red-400 mt-1">Required — appears on your certificate</p>
        </div>

        <div className="space-y-6 text-left mb-10">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">FULL NAME</label>
            <input
              type="text"
              value={userData.fullName}
              onChange={e => onChange({ fullName: e.target.value.toUpperCase() })}
              className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm uppercase focus:border-teal-400 focus:ring-4 focus:ring-teal-50 focus:bg-white transition-all outline-none text-gray-900 font-medium placeholder:text-gray-400"
              placeholder="JOHN DOE"
            />
          </div>
          
          {(pledge.collectPhone || pledge.collectEmail) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pledge.collectPhone && (
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">WHATSAPP</label>
              <div className="flex">
                <div className="bg-gray-50/50 border border-gray-200 border-r-0 rounded-l-xl px-4 py-3.5 text-sm text-gray-600 font-medium flex items-center justify-center">
                  India (+91)
                </div>
                <input
                  type="tel"
                  value={userData.whatsapp}
                  onChange={e => onChange({ whatsapp: e.target.value })}
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-r-xl px-4 py-3.5 text-sm focus:border-teal-400 focus:ring-4 focus:ring-teal-50 focus:bg-white transition-all outline-none text-gray-900 font-medium placeholder:text-gray-400"
                  placeholder="98765 43210"
                />
              </div>
            </div>
            )}
            {pledge.collectEmail && (
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">EMAIL</label>
              <input
                type="email"
                value={userData.email}
                onChange={e => onChange({ email: e.target.value })}
                className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm focus:border-teal-400 focus:ring-4 focus:ring-teal-50 focus:bg-white transition-all outline-none text-gray-900 font-medium placeholder:text-gray-400"
                placeholder="name@example.com"
              />
            </div>
            )}
          </div>
          )}

          <label className="flex items-start gap-4 cursor-pointer group mt-6 pt-4">
            <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded flex items-center justify-center border transition-colors ${userData.consent ? 'bg-[#f97316] border-[#f97316]' : 'bg-gray-50 border-gray-300 group-hover:border-gray-400'}`}>
              <input
                type="checkbox"
                className="hidden"
                checked={userData.consent}
                onChange={(e) => onChange({ consent: e.target.checked })}
              />
              {userData.consent && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
            </div>
            <span className="text-sm text-gray-600 leading-snug select-none">
              I have read and agree to the{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#f97316] underline font-medium" onClick={(e) => e.stopPropagation()}>
                Privacy Policy &amp; Terms
              </a>
              , including how my data (and any child&apos;s data I submit) is used, stored, and deleted after 3 months. If I am under 18, my parent, guardian or school has consented to my details being submitted. <span className="text-red-500">*</span>
            </span>
          </label>

          <label className="flex items-start gap-4 cursor-pointer group mt-3">
            <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded flex items-center justify-center border transition-colors ${userData.agreed ? 'bg-[#f97316] border-[#f97316]' : 'bg-gray-50 border-gray-300 group-hover:border-gray-400'}`}>
              <input
                type="checkbox"
                className="hidden"
                checked={userData.agreed}
                onChange={(e) => onChange({ agreed: e.target.checked })}
              />
              {userData.agreed && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
            </div>
            <span className="text-sm text-gray-600 leading-snug select-none">
              I agree to receive information about similar initiatives in the future. (Optional)
            </span>
          </label>
        </div>

        {!userData.photoUrl && (
          <p className="text-xs text-red-400 text-center -mb-2">Please add your photo to continue</p>
        )}
        <button
          onClick={onNext}
          disabled={!isValid}
          className={`w-full py-4 rounded-xl font-bold text-[15px] transition-all
            ${isValid
              ? 'bg-[#1e1b4b] text-white hover:bg-[#2a2660] shadow-md'
              : 'bg-[#f1f5f9] text-gray-400 cursor-not-allowed'}`}
        >
          Continue <span className="ml-1">›</span>
        </button>

      </div>
    </>
  );
}

// -------------------------------------------------------------
// Step 2: Preview
// -------------------------------------------------------------
function PledgePreview({ userData, pledge, onBack, onConfirm }: { userData: UserData, pledge: PledgeWithCommitments, onBack: () => void, onConfirm: () => void }) {
  const today = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 md:p-12 text-center">
      <div className="flex justify-between items-center mb-10">
        <button onClick={onBack} className="text-sm font-semibold text-gray-500 hover:text-gray-800 flex items-center transition-colors">
          <ArrowLeft className="w-4 h-4 mr-1" /> Edit Details
        </button>
        <div className="bg-orange-50 text-[#f97316] text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          Step 2 of 3
        </div>
      </div>
      
      <h2 className="text-2xl font-extrabold text-[#1e1b4b] mb-2 tracking-tight">Preview Certificate</h2>
      <p className="text-sm text-gray-500 mb-10">Review your details carefully. This is how your certificate will look.</p>
      
      <div className="max-w-[400px] mx-auto mb-10 shadow-2xl shadow-black/10 rounded-[1.5rem] overflow-hidden bg-white">
        <PledgePosterCanvas
          userName={userData.fullName}
          pledgeName={pledge.name}
          date={today}
          bgImageUrl={pledge.bgImageUrl}
          userPhotoUrl={userData.photoUrl}
          width={800} // higher res for better anti-aliasing in preview
          layout={getPledgeLayout(pledge)}
          cert={parseCert(pledge.certConfig)}
        />
      </div>

      <div className="flex gap-4 max-w-[400px] mx-auto">
        <button 
          onClick={onBack}
          className="flex-[0.35] py-4 rounded-xl border-2 border-gray-100 text-gray-700 font-bold hover:bg-gray-50 transition-colors shadow-sm bg-white flex items-center justify-center gap-2"
        >
          <Edit2 className="w-4 h-4 text-gray-400"/> Modify
        </button>
        <button 
          onClick={onConfirm}
          className="flex-[0.65] py-4 rounded-xl bg-[#f97316] text-white font-bold hover:bg-[#ea580c] transition-colors shadow-sm flex items-center justify-center gap-2"
        >
          Looks Good <Check className="w-4 h-4" strokeWidth={3} />
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Step 3: Commitments (The Checkboxes) & Submission
// -------------------------------------------------------------
function PledgeCommitments({ pledge, userData, orgId, onBack, onSuccess }: { pledge: PledgeWithCommitments, userData: UserData, orgId?: string, onBack: () => void, onSuccess: () => void }) {
  // Commitments start UNticked — the user must actively tick each pledge.
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allChecked  = pledge.commitments.length > 0 && pledge.commitments.every(c => checked[c.id]);

  const handleSelectAll = () => {
    const next = !allChecked;
    setChecked(Object.fromEntries(pledge.commitments.map(c => [c.id, next])));
  };
  
  const handleToggle = (id: string) => setChecked(prev => ({ ...prev, [id]: !prev[id] }));

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pledgeId: pledge.id,
          userName: userData.fullName,
          userEmail: userData.email,
          whatsapp: userData.whatsapp,
          agreed: userData.agreed,
          ...(orgId && { orgId }),
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to submit your pledge. Please try again.');
      }

      onSuccess();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden relative flex flex-col min-h-[70vh]">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10 shadow-sm">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-[17px] font-bold text-[#1e1b4b] absolute left-1/2 -translate-x-1/2">The Pledge</h2>
        <button 
          onClick={handleSelectAll} 
          className="text-[11px] font-bold text-[#f97316] uppercase tracking-wider relative group"
        >
          {allChecked ? 'DESELECT ALL' : 'SELECT ALL'}
          <div className="absolute -bottom-1 left-0 w-full h-[2px] bg-[#f97316] scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
        </button>
      </div>
      
      {/* Commitment List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-32">
        {pledge.commitments.map((c) => (
          <label key={c.id} className="flex items-start gap-4 cursor-pointer group">
            <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded flex items-center justify-center border transition-colors ${checked[c.id] ? 'bg-[#1e1b4b] border-[#1e1b4b]' : 'border-gray-300 bg-white group-hover:border-[#1e1b4b]'}`}>
              {checked[c.id] && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
            </div>
            <span className={`text-[15px] leading-snug select-none transition-colors ${checked[c.id] ? 'text-gray-900 font-medium' : 'text-gray-500 group-hover:text-gray-700'}`}>
              {c.text}
            </span>
          </label>
        ))}
      </div>

      {/* Floating Action Bar */}
      <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-white via-white to-transparent pt-16 mt-auto">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl text-center font-medium animate-shake">
            {error}
          </div>
        )}
        <button 
          onClick={handleSubmit}
          disabled={!allChecked || isSubmitting}
          className={`w-full py-4 rounded-xl font-bold text-[15px] transition-all flex items-center justify-center gap-2
            ${allChecked 
              ? 'bg-[#1e1b4b] text-white hover:bg-[#312e81] shadow-lg shadow-indigo-900/20' 
              : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-70'}`}
        >
          {isSubmitting ? (
             <><Loader2 className="w-5 h-5 animate-spin"/> Processing...</>
          ) : (
            `Take the Pledge ${allChecked ? "→" : ""}`
          )}
        </button>
        {!allChecked && <p className="text-center text-xs text-gray-400 mt-3">Select all to continue</p>}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Edit Certificate Modal (shared by PledgeSuccess)
// -------------------------------------------------------------
function EditCertModal({ current, onSave, onClose }: {
  current: { fullName: string; photoUrl: string | null };
  onSave: (updated: { fullName: string; photoUrl: string | null }) => void;
  onClose: () => void;
}) {
  const [name, setName]             = useState(current.fullName);
  const [photoUrl, setPhotoUrl]     = useState<string | null>(current.photoUrl);
  const [rawImageSrc, setRawImg]    = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const galleryRef                  = useRef<HTMLInputElement>(null);

  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsProcessingPhoto(true);
    try {
      const dataUrl = await downscaleImage(file);
      setRawImg(dataUrl);
    } catch (err) {
      console.error('[Photo] downscale failed', err);
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  return (
    <>
      {showCamera && (
        <CameraModal
          onCapture={(src) => { setShowCamera(false); setRawImg(src); }}
          onClose={() => setShowCamera(false)}
        />
      )}
      {isProcessingPhoto && !rawImageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-2xl px-6 py-5 flex items-center gap-3 shadow-xl">
            <Loader2 className="w-5 h-5 animate-spin text-[#1e1b4b]"/>
            <span className="font-semibold text-[#1e1b4b]">Preparing photo…</span>
          </div>
        </div>
      )}
      {rawImageSrc && (
        <PhotoCropModal
          imageSrc={rawImageSrc}
          onClose={() => setRawImg(null)}
          onCropSave={(cropped) => { setPhotoUrl(cropped); setRawImg(null); }}
        />
      )}
      <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/60 p-4">
        <div className="bg-white rounded-[1.5rem] w-full max-w-sm overflow-hidden">
          <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 text-lg">Edit Details</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 space-y-5">
            <div className="flex flex-col items-center gap-3">
              <div
                onClick={() => galleryRef.current?.click()}
                className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer overflow-hidden relative group"
              >
                {photoUrl
                  ? <img src={photoUrl} className="w-full h-full object-cover" alt="photo" />
                  : <Camera className="w-7 h-7 text-gray-400" />
                }
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Edit2 className="w-5 h-5 text-white" />
                </div>
              </div>
              <input ref={galleryRef} type="file" accept="image/*" style={{ position: 'absolute', width: 0, height: 0, opacity: 0 }} onChange={handleFile} />
              <div className="flex gap-4 text-[11px] font-bold text-[#1e1b4b] uppercase tracking-widest">
                <button type="button" onClick={() => galleryRef.current?.click()} className="hover:text-[#f97316] transition-colors">Gallery</button>
                <span className="text-gray-300">|</span>
                <button type="button" onClick={() => setShowCamera(true)} className="hover:text-[#f97316] transition-colors">Camera</button>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Name on Certificate</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value.toUpperCase())}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm uppercase focus:border-[#1e1b4b] focus:ring-4 focus:ring-indigo-50 outline-none font-medium text-gray-900"
                placeholder="YOUR NAME"
              />
            </div>
          </div>
          <div className="px-6 pb-6 flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border-2 border-gray-100 text-gray-600 font-bold hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={() => { onSave({ fullName: name, photoUrl }); onClose(); }}
              disabled={name.trim().length < 2}
              className="flex-1 py-3 rounded-xl bg-[#1e1b4b] text-white font-bold hover:bg-[#312e81] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Update
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// -------------------------------------------------------------
// Step 4: Success
// -------------------------------------------------------------
function PledgeSuccess({ pledge, userData: initialUserData, onReturnHome }: { pledge: PledgeWithCommitments, userData: UserData, onReturnHome: () => void }) {
  const canvasRef               = useRef<HTMLCanvasElement>(null);
  const today                   = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());
  const [cert, setCert]         = useState(initialUserData);
  const [showEdit, setShowEdit] = useState(false);

  const handleDownload = () => {
    if (canvasRef.current) downloadPoster(canvasRef.current, cert.fullName);
  };

  const handleShare = () => {
    if (canvasRef.current) sharePoster(canvasRef.current, cert.fullName, window.location.href);
  };

  const layout = getPledgeLayout(pledge);
  const certLayout = parseCert(pledge.certConfig);
  const certOnly = isCertificateOnly(pledge);
  const heading  = certOnly ? 'Your Certificate is Ready!' : 'Pledge Taken!';
  const subtitle = certOnly
    ? `Thank you for joining ${pledge.name} — here's your certificate.`
    : 'Your pledge has been recorded. Thank you for taking action.';

  return (
    <>
      {showEdit && (
        <EditCertModal
          current={cert}
          onSave={(updated) => setCert(c => ({ ...c, ...updated }))}
          onClose={() => setShowEdit(false)}
        />
      )}

      <div className="text-center pt-8">
        <div className="w-16 h-16 bg-[#dcfce7] text-[#22c55e] rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
          <Check className="w-8 h-8" strokeWidth={3} />
        </div>
        <h2 className="text-3xl font-extrabold text-[#111827] mb-2 tracking-tight">{heading} <span className="ml-1">🎉</span></h2>
        <p className="text-gray-500 mb-10">
          Thank you, <span className="font-bold text-gray-900">{cert.fullName}</span>.<br/>{subtitle}
        </p>

        {/* Hidden HD Canvas for Download */}
        <div className="hidden">
          <PledgePosterCanvas
            ref={canvasRef}
            userName={cert.fullName}
            pledgeName={pledge.name}
            date={today}
            bgImageUrl={pledge.bgImageUrl}
            userPhotoUrl={cert.photoUrl}
            width={1080}
            layout={layout}
            cert={certLayout}
          />
        </div>

        <div className="max-w-[400px] mx-auto mb-4 shadow-2xl shadow-black/10 rounded-[1.5rem] overflow-hidden pointer-events-none bg-white">
          <PledgePosterCanvas
            userName={cert.fullName}
            pledgeName={pledge.name}
            date={today}
            bgImageUrl={pledge.bgImageUrl}
            userPhotoUrl={cert.photoUrl}
            width={800}
            layout={layout}
            cert={certLayout}
          />
        </div>

        {/* Edit Details */}
        <button
          onClick={() => setShowEdit(true)}
          className="mb-8 flex items-center gap-2 mx-auto text-sm font-semibold text-gray-500 hover:text-[#f97316] transition-colors"
        >
          <Edit2 className="w-4 h-4" /> Edit Details
        </button>

        <div className="flex gap-4 max-w-[400px] mx-auto mb-6">
          <button
            onClick={handleDownload}
            className="flex-1 py-4.5 rounded-xl bg-[#292524] text-white font-bold hover:bg-black transition-colors shadow-md flex items-center justify-center text-[15px]"
          >
            ⬇ Download
          </button>
          <button
            onClick={handleShare}
            className="flex-1 py-4.5 rounded-xl bg-[#f97316] text-white font-bold hover:bg-[#ea580c] transition-colors shadow-md flex items-center justify-center text-[15px]"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path></svg>
            Share
          </button>
        </div>

        <div className="max-w-[400px] mx-auto pb-10">
          <button
            onClick={onReturnHome}
            className="w-full py-4.5 rounded-xl border-2 border-gray-200 text-gray-700 font-bold hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center justify-center bg-white text-[15px]"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            RETURN HOME
          </button>
        </div>
      </div>
    </>
  );
}
