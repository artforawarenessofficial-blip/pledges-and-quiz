"use client";
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Quiz, Question, AnswerOption } from '@prisma/client';
import { PledgePosterCanvas } from './PledgePosterCanvas';
import type { CertConfig } from './PledgePosterCanvas';
import { downloadPoster, sharePoster } from '@/utils/downloadPoster';
import { Check, X, Loader2, Camera, Edit2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import getCroppedImg from '@/utils/cropImage';

function parseCert(raw: string | null | undefined): CertConfig | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(raw) as CertConfig;
    if (c && (c.name || c.photo || (c.images && c.images.length))) return c;
  } catch { /* ignore malformed */ }
  return null;
}
function quizLayout(quiz: { slug: string; certConfig?: string | null }): string {
  if (parseCert(quiz.certConfig)) return 'custom';
  return quiz.slug === 'house-sparrow' ? 'sparrow' : 'default';
}

type QuestionWithOptions = Omit<Question, 'quizId'> & {
  answerOptions: Omit<AnswerOption, 'isCorrect' | 'questionId'>[]
};
type QuizWithQuestions = Quiz & { questions: QuestionWithOptions[] };

type QuizStep = 'form' | 'quiz' | 'preview' | 'success';

interface UserData {
  fullName: string;
  email: string;
  whatsapp: string;
  photoUrl: string | null;
  agreed: boolean;
  consent: boolean;
  orgId?: string;
}

export function QuizFlow({ quiz, orgId, posterUrl, orgLogoUrl, logoPosition }: { quiz: QuizWithQuestions; orgId?: string; posterUrl?: string; orgLogoUrl?: string | null; logoPosition?: string | null }) {
  const [currentStep, setCurrentStep] = useState<QuizStep>('form');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [userData, setUserData] = useState<UserData>({ fullName: '', email: '', whatsapp: '', photoUrl: null, agreed: true, consent: true, orgId });
  const [scoreData, setScoreData] = useState<{ score: number, total: number } | null>(null);
  const activePosterUrl = posterUrl ?? quiz.bgImageUrl;

  const goToStep = (step: QuizStep) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentStep(step);
      window.scrollTo(0, 0);
      setTimeout(() => setIsTransitioning(false), 50);
    }, 16);
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* Top light gradient */}
      <div className="fixed top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-stone-200/40 to-transparent pointer-events-none z-0" />

      <main className={`relative z-10 max-w-2xl flex flex-col justify-center min-h-[90vh] mx-auto px-4 py-12 transition-opacity duration-200 ease-in-out ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        {currentStep === 'form' && (
          <QuizForm
            quiz={quiz}
            onSubmit={(data) => { setUserData(data); goToStep('quiz'); }}
          />
        )}
        {currentStep === 'quiz' && (
          <QuizEngine
            quiz={quiz}
            userData={userData}
            onComplete={(_answers, scoreRes) => {
              setScoreData(scoreRes);
              goToStep('preview');
            }}
          />
        )}
        {currentStep === 'preview' && (
          <QuizCertPreview
            quiz={quiz}
            userData={userData}
            scoreData={scoreData}
            posterUrl={activePosterUrl}
            orgLogoUrl={orgLogoUrl}
            logoPosition={logoPosition}
            onRetake={() => {
              setScoreData(null);
              goToStep('form');
            }}
            onConfirm={(updated) => {
              setUserData(updated);
              goToStep('success');
            }}
          />
        )}
        {currentStep === 'success' && (
          <QuizSuccess
            quiz={quiz}
            userData={userData}
            posterUrl={activePosterUrl}
            orgLogoUrl={orgLogoUrl}
            logoPosition={logoPosition}
          />
        )}
      </main>
    </div>
  );
}

function PhotoCropModal({ imageSrc, onClose, onCropSave }: {
  imageSrc: string;
  onClose: () => void;
  onCropSave: (cropped: string) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, cap: Area) => {
    setCroppedAreaPixels(cap);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    try {
      const result = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (result) onCropSave(result);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-white rounded-[1.5rem] w-full max-w-md overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Edit2 className="w-4 h-4 text-teal-500" /> Adjust Photo
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="relative w-full h-[300px] sm:h-[380px] bg-black">
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
          <button onClick={handleSave} className="px-5 py-2.5 rounded-xl bg-teal-500 text-white font-bold hover:bg-teal-600 shadow-md transition-colors">
            Save Photo
          </button>
        </div>
      </div>
    </div>
  );
}

function CameraModal({ onCapture, onClose }: { onCapture: (src: string) => void; onClose: () => void }) {
  const videoRef                      = useRef<HTMLVideoElement>(null);
  const [stream, setStream]           = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode]   = useState<'user' | 'environment'>('user');
  const [error, setError]             = useState<string | null>(null);

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
                <div className="w-[60px] h-[60px] rounded-full bg-white border-[3px] border-black" />
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

function QuizForm({ quiz, onSubmit }: { quiz: QuizWithQuestions, onSubmit: (data: UserData) => void }) {
  const [formData, setFormData] = useState<UserData>({
    fullName: '', email: '', whatsapp: '', photoUrl: null, agreed: true, consent: true
  });
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [showCamera, setShowCamera]   = useState(false);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setRawImageSrc(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const emailOk = !quiz.collectEmail || (formData.email.includes('@') && formData.email.includes('.'));
  const phoneOk = !quiz.collectPhone || formData.whatsapp.length > 5;
  const isValid = formData.photoUrl !== null && formData.fullName.length > 2 && emailOk && phoneOk && formData.consent;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) onSubmit(formData);
  };

  return (
    <>
      {showCamera && (
        <CameraModal
          onCapture={(src) => { setShowCamera(false); setRawImageSrc(src); }}
          onClose={() => setShowCamera(false)}
        />
      )}
      {rawImageSrc && (
        <PhotoCropModal
          imageSrc={rawImageSrc}
          onClose={() => setRawImageSrc(null)}
          onCropSave={(cropped) => { setFormData(f => ({ ...f, photoUrl: cropped })); setRawImageSrc(null); }}
        />
      )}

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 md:p-12 text-center max-w-xl mx-auto w-full">
        <div className="inline-block px-4 py-1.5 rounded-full bg-teal-50 text-teal-600 font-bold text-[10px] uppercase tracking-widest mb-4">
          QUIZ: {quiz.title.toUpperCase()}
        </div>
        <h2 className="text-3xl font-extrabold text-[#111827] mb-2 tracking-tight">Before we start...</h2>
        <p className="text-gray-500 mb-8">Enter your details for the certificate. No login required.</p>

        {/* Photo Upload */}
        <div className="flex flex-col items-center mb-10">
          <div
            onClick={() => galleryRef.current?.click()}
            className="w-24 h-24 rounded-full bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors relative overflow-hidden group"
          >
            {formData.photoUrl ? (
              <img src={formData.photoUrl} className="w-full h-full object-cover" alt="You" />
            ) : (
              <Camera className="w-7 h-7 text-gray-300 group-hover:text-gray-400 transition-colors" />
            )}
            <div className="absolute right-0 bottom-0 w-7 h-7 bg-teal-500 rounded-full flex items-center justify-center border-2 border-white">
              <Edit2 className="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          {/* Gallery input */}
          <input ref={galleryRef} type="file" accept="image/*" style={{ position: 'absolute', width: 0, height: 0, opacity: 0, overflow: 'hidden' }} onChange={handleFile} />

          <div className="flex gap-4 mt-4 text-[10px] font-bold text-teal-600 uppercase tracking-widest">
            <button type="button" onClick={() => galleryRef.current?.click()} className="hover:text-teal-700 transition-colors">
              Gallery
            </button>
            <div className="w-[1px] h-3 bg-gray-300 self-center" />
            <button type="button" onClick={() => setShowCamera(true)} className="hover:text-teal-700 transition-colors">
              Camera
            </button>
          </div>
          <p className="text-[10px] text-red-400 mt-1">Required — appears on your certificate</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">FULL NAME*</label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={e => setFormData({ ...formData, fullName: e.target.value.toUpperCase() })}
              className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm uppercase focus:border-teal-400 focus:ring-4 focus:ring-teal-50 focus:bg-white transition-all outline-none text-gray-900 font-medium placeholder:text-gray-400"
              placeholder="HOW YOU WANT YOUR NAME ON THE CERTIFICATE"
            />
          </div>

          {(quiz.collectPhone || quiz.collectEmail) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quiz.collectPhone && (
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">WHATSAPP*</label>
              <div className="flex">
                <div className="bg-gray-50/50 border border-gray-200 border-r-0 rounded-l-xl px-4 py-3.5 text-xs text-gray-600 font-medium flex items-center justify-center whitespace-nowrap">
                  India (+91)
                </div>
                <input
                  type="tel"
                  required
                  value={formData.whatsapp}
                  onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-r-xl px-4 py-3.5 text-sm focus:border-teal-400 focus:ring-4 focus:ring-teal-50 focus:bg-white transition-all outline-none text-gray-900 font-medium placeholder:text-gray-400"
                  placeholder="98765 43210"
                />
              </div>
            </div>
            )}
            {quiz.collectEmail && (
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">EMAIL*</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3.5 text-sm focus:border-teal-400 focus:ring-4 focus:ring-teal-50 focus:bg-white transition-all outline-none text-gray-900 font-medium placeholder:text-gray-400"
                placeholder="name@example.com"
              />
            </div>
            )}
          </div>
          )}

          <label className="flex items-start gap-4 cursor-pointer group pt-2">
            <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded flex items-center justify-center border transition-colors ${formData.consent ? 'bg-teal-500 border-teal-500' : 'bg-gray-50 border-gray-300 group-hover:border-gray-400'}`}>
              <input type="checkbox" className="hidden" checked={formData.consent} onChange={e => setFormData({ ...formData, consent: e.target.checked })} />
              {formData.consent && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
            </div>
            <span className="text-xs text-gray-600 leading-snug select-none">
              I have read and agree to the{' '}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-teal-600 underline font-medium" onClick={e => e.stopPropagation()}>
                Privacy Policy &amp; Terms
              </a>
              , including how my data (and any child&apos;s data I submit) is used, stored, and deleted after 3 months. If I am under 18, my parent, guardian or school has consented to my details being submitted. <span className="text-red-500">*</span>
            </span>
          </label>

          <label className="flex items-start gap-4 cursor-pointer group pt-2">
            <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded flex items-center justify-center border transition-colors ${formData.agreed ? 'bg-teal-500 border-teal-500' : 'bg-gray-50 border-gray-300 group-hover:border-gray-400'}`}>
              <input type="checkbox" className="hidden" checked={formData.agreed} onChange={e => setFormData({ ...formData, agreed: e.target.checked })} />
              {formData.agreed && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
            </div>
            <span className="text-xs text-gray-600 leading-snug select-none">
              I agree to receive information about similar initiatives in the future. (Optional)
            </span>
          </label>

          {!formData.photoUrl && (
            <p className="text-xs text-red-400 text-center -mb-2">Please add your photo to continue</p>
          )}
          <button
            type="submit"
            disabled={!isValid}
            className={`w-full py-4 rounded-xl font-bold text-[15px] transition-all mt-4
              ${isValid ? 'bg-teal-500 text-white hover:bg-teal-600 shadow-lg shadow-teal-500/20' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
          >
            Start Quiz <span className="ml-1">›</span>
          </button>
        </form>
      </div>
    </>
  );
}

function QuizEngine({ quiz, userData, onComplete }: {
  quiz: QuizWithQuestions,
  userData: UserData,
  onComplete: (answers: Record<string, string>, scoreRes: { score: number, total: number }) => void
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  // No per-question answer reveal: correctness is validated server-side only at
  // submission time. This removes the old /api/verify-answer endpoint that leaked
  // the correct answer for any questionId with no auth.
  const [answerState, setAnswerState] = useState<'idle' | 'selected' | 'submitting'>('idle');
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const question = quiz.questions[currentIndex];

  const moodColor = 'bg-stone-200';

  const handleSelect = (aId: string) => {
    // Allow changing the pick freely until it's confirmed.
    if (answerState === 'submitting') return;
    setSelectedOptionId(aId);
    setAnswerState('selected');
  };

  const handleConfirm = async () => {
    if (answerState !== 'selected' || !selectedOptionId) return;

    const newAnswers = { ...answers, [question.id]: selectedOptionId };
    setAnswers(newAnswers);

    if (currentIndex < quiz.questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setAnswerState('idle');
      setSelectedOptionId(null);
      return;
    }

    // Last question — score the whole attempt server-side.
    setAnswerState('submitting');
    try {
      const attemptRes = await fetch('/api/quiz-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: quiz.id,
          userName: userData.fullName,
          userEmail: userData.email,
          whatsapp: userData.whatsapp,
          agreed: userData.agreed,
          orgId: userData.orgId,
          answers: newAnswers
        })
      });
      const attemptData = await attemptRes.json();
      onComplete(newAnswers, { score: attemptData.score, total: attemptData.totalQuestions });
    } catch (e) {
      console.error(e);
      setAnswerState('selected');
    }
  };

  const progress = ((currentIndex) / quiz.questions.length) * 100;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 max-w-xl mx-auto w-full relative">
      <div className={`fixed bottom-6 right-6 w-12 h-12 rounded-full transition-colors duration-500 shadow-lg ${moodColor}`} />

      <div className="mb-8">
        <div className="flex justify-between text-sm font-medium text-gray-500 mb-3">
          <span>Question {currentIndex + 1} of {quiz.questions.length}</span>
        </div>
        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-teal-400 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <h2 className="text-2xl font-inter font-bold text-gray-900 mb-8">{question.text}</h2>

      <div className="space-y-3 mb-8">
        {question.answerOptions.map((opt) => {
          const isSelected = selectedOptionId === opt.id;

          let optStyle = "border-gray-200 hover:border-yellow-400 hover:bg-gray-50";
          if (answerState === 'selected' || answerState === 'submitting') {
            optStyle = isSelected ? "border-yellow-400 ring-2 ring-yellow-400/20 bg-yellow-50 scale-[1.02]" : "border-gray-200 opacity-75";
          }

          return (
            <button
              key={opt.id}
              onClick={() => handleSelect(opt.id)}
              disabled={answerState === 'submitting'}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-300 font-medium text-gray-800 flex justify-between items-center ${optStyle}`}
            >
              <span>{opt.text}</span>
            </button>
          );
        })}
      </div>

      <div className="h-16 flex items-center justify-center">
        {answerState === 'selected' && (
          <button onClick={handleConfirm} className="w-full py-4 rounded-full bg-teal-500 hover:bg-teal-600 text-white font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 transform">
            {currentIndex < quiz.questions.length - 1 ? 'Next Question' : 'Submit Quiz'}
          </button>
        )}
        {answerState === 'submitting' && (
          <div className="flex items-center text-teal-600 font-medium">
            <Loader2 className="w-5 h-5 animate-spin mr-3" />
            Calculating final score...
          </div>
        )}
      </div>
    </div>
  );
}

function QuizCertPreview({ quiz, userData: initialUserData, scoreData, posterUrl, orgLogoUrl, logoPosition, onRetake, onConfirm }: {
  quiz: QuizWithQuestions;
  userData: UserData;
  scoreData: { score: number; total: number } | null;
  posterUrl: string;
  orgLogoUrl?: string | null;
  logoPosition?: string | null;
  onRetake: () => void;
  onConfirm: (updated: UserData) => void;
}) {
  const today = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());
  const [cert, setCert]         = useState(initialUserData);
  const [showEdit, setShowEdit] = useState(false);

  return (
    <>
      {showEdit && (
        <EditCertModal
          current={cert}
          onSave={(updated) => setCert(c => ({ ...c, ...updated }))}
          onClose={() => setShowEdit(false)}
        />
      )}

    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden w-full max-w-5xl mx-auto flex flex-col md:flex-row">
      <div className="p-10 md:w-2/5 flex flex-col justify-center border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50/50">
        <h2 className="text-3xl font-montserrat font-bold text-gray-900 mb-2">Quiz Complete!</h2>
        <p className="text-gray-600 mb-8">You've unlocked your certificate of completion.</p>

        {scoreData && (
          <div className="bg-white rounded-2xl p-6 border border-gray-200 mb-6 shadow-sm text-center">
            <div className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Your Score</div>
            <div className="text-5xl font-ibm-mono font-bold text-teal-500">
              {scoreData.score} <span className="text-2xl text-gray-300">/ {scoreData.total}</span>
            </div>
          </div>
        )}

        {/* Edit Details */}
        <button
          onClick={() => setShowEdit(true)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-teal-600 transition-colors mb-8"
        >
          <Edit2 className="w-4 h-4" /> Edit Details
        </button>

        <div className="space-y-4 mt-auto">
          <button
            onClick={() => onConfirm(cert)}
            className="w-full py-4 px-6 rounded-full bg-teal-500 text-white font-bold hover:bg-teal-600 transition-colors shadow-lg shadow-teal-500/20"
          >
            Generate My Certificate
          </button>
          <button
            onClick={onRetake}
            className="w-full py-4 px-6 rounded-full border-2 border-gray-200 text-gray-600 font-semibold hover:border-gray-300 transition-colors"
          >
            Retake Quiz
          </button>
        </div>
      </div>

      <div className="p-10 md:w-3/5 bg-gray-100 flex items-center justify-center">
        <div className="w-full max-w-sm shadow-2xl rounded-xl overflow-hidden pointer-events-none">
          <PledgePosterCanvas
            userName={cert.fullName}
            pledgeName={quiz.title}
            date={today}
            bgImageUrl={posterUrl}
            userPhotoUrl={cert.photoUrl}
            width={720}
            isQuiz={true}
            layout={quizLayout(quiz)}
            cert={parseCert(quiz.certConfig)}
            orgLogoUrl={orgLogoUrl}
            logoPosition={logoPosition}
          />
        </div>
      </div>
    </div>
    </>
  );
}

function EditCertModal({ current, onSave, onClose }: {
  current: UserData;
  onSave: (updated: Pick<UserData, 'fullName' | 'photoUrl'>) => void;
  onClose: () => void;
}) {
  const [name, setName]           = useState(current.fullName);
  const [photoUrl, setPhotoUrl]   = useState<string | null>(current.photoUrl);
  const [rawImageSrc, setRawImg]  = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const galleryRef                = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setRawImg(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <>
      {showCamera && (
        <CameraModal
          onCapture={(src) => { setShowCamera(false); setRawImg(src); }}
          onClose={() => setShowCamera(false)}
        />
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
          {/* Header */}
          <div className="flex justify-between items-center px-6 pt-6 pb-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 text-lg">Edit Certificate</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Photo */}
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
              <div className="flex gap-4 text-[11px] font-bold text-teal-600 uppercase tracking-widest">
                <button type="button" onClick={() => galleryRef.current?.click()}>Gallery</button>
                <span className="text-gray-300">|</span>
                <button type="button" onClick={() => setShowCamera(true)}>Camera</button>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Name on Certificate</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value.toUpperCase())}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm uppercase focus:border-teal-400 focus:ring-4 focus:ring-teal-50 outline-none font-medium text-gray-900"
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
              className="flex-1 py-3 rounded-xl bg-teal-500 text-white font-bold hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Update
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function QuizSuccess({ quiz, userData: initialUserData, posterUrl, orgLogoUrl, logoPosition }: { quiz: QuizWithQuestions, userData: UserData, posterUrl: string, orgLogoUrl?: string | null, logoPosition?: string | null }) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const today       = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date());
  const [cert, setCert]       = useState(initialUserData);
  const [showEdit, setShowEdit] = useState(false);

  const handleDownload = () => {
    if (canvasRef.current) downloadPoster(canvasRef.current, cert.fullName, 'Quiz');
  };

  const handleShare = () => {
    if (canvasRef.current) sharePoster(canvasRef.current, cert.fullName, window.location.href);
  };

  return (
    <>
      {showEdit && (
        <EditCertModal
          current={cert}
          onSave={(updated) => setCert(c => ({ ...c, ...updated }))}
          onClose={() => setShowEdit(false)}
        />
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center max-w-2xl mx-auto w-full">
        <div className="w-16 h-16 bg-teal-100 text-teal-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Check className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-montserrat font-bold text-gray-900 mb-2">🎉 Your Certificate is Ready!</h2>
        <p className="text-gray-600 mb-8">Great job, {cert.fullName}! Your achievement is now officially recognized.</p>

        {/* Hidden HD canvas for download */}
        <div className="hidden">
          <PledgePosterCanvas
            ref={canvasRef}
            userName={cert.fullName}
            pledgeName={quiz.title}
            date={today}
            bgImageUrl={posterUrl}
            userPhotoUrl={cert.photoUrl}
            width={1080}
            isQuiz={true}
            layout={quizLayout(quiz)}
            cert={parseCert(quiz.certConfig)}
            orgLogoUrl={orgLogoUrl}
            logoPosition={logoPosition}
          />
        </div>

        {/* Preview */}
        <div className="max-w-sm mx-auto mb-4 shadow-xl rounded-xl overflow-hidden pointer-events-none">
          <PledgePosterCanvas
            userName={cert.fullName}
            pledgeName={quiz.title}
            date={today}
            bgImageUrl={posterUrl}
            userPhotoUrl={cert.photoUrl}
            width={720}
            isQuiz={true}
            layout={quizLayout(quiz)}
            cert={parseCert(quiz.certConfig)}
            orgLogoUrl={orgLogoUrl}
            logoPosition={logoPosition}
          />
        </div>

        {/* Edit certificate */}
        <button
          onClick={() => setShowEdit(true)}
          className="mb-8 flex items-center gap-2 mx-auto text-sm font-semibold text-gray-500 hover:text-teal-600 transition-colors"
        >
          <Edit2 className="w-4 h-4" /> Edit Details
        </button>

        <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto mb-10">
          <button
            onClick={handleDownload}
            className="flex-1 py-4 px-6 rounded-full bg-teal-500 text-white font-bold hover:bg-teal-600 shadow-lg shadow-teal-500/20 transition-all flex justify-center items-center gap-2"
          >
            <span>⬇️</span> Download Certificate (PNG)
          </button>
          <button
            onClick={handleShare}
            className="flex-1 py-4 px-6 rounded-full bg-gray-900 text-white font-semibold hover:bg-gray-800 transition-colors"
          >
            📤 Share
          </button>
        </div>

        <div className="pt-8 border-t border-gray-100 flex flex-col sm:flex-row gap-4 justify-center text-sm font-medium">
          <Link href="/quiz" className="text-teal-600 hover:text-teal-700">Take Another Quiz →</Link>
          <span className="hidden sm:inline text-gray-300">|</span>
          <Link href="/organizations" className="text-gray-500 hover:text-gray-800">Bring to Your Organization →</Link>
        </div>
      </div>
    </>
  );
}
