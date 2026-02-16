'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Globe, Shield, Zap, AlertCircle, Copy, ExternalLink } from 'lucide-react';

const CATEGORIES = [
  { id: 'image-generation', label: 'Image Generation', desc: 'DALL-E, Flux, Midjourney, Stable Diffusion' },
  { id: 'translation', label: 'Translation', desc: 'DeepL, Google Translate, multi-language' },
  { id: 'transcription', label: 'Transcription', desc: 'Whisper, AssemblyAI, audio-to-text' },
  { id: 'code-review', label: 'Code Review', desc: 'Automated review, linting, vulnerability scan' },
  { id: 'data-analysis', label: 'Data Analysis', desc: 'Analytics, sentiment, classification' },
  { id: 'text-generation', label: 'Text Generation', desc: 'LLMs, summarisation, content creation' },
  { id: 'embedding', label: 'Embedding', desc: 'Vector embeddings for RAG, search, similarity' },
  { id: 'search', label: 'Search', desc: 'Web search, knowledge retrieval, indexing' },
];

interface FormData {
  name: string;
  category: string;
  endpoint: string;
  description: string;
  pricing: string;
  walletAddress: string;
  x402Enabled: boolean;
}

const INITIAL: FormData = {
  name: '',
  category: '',
  endpoint: '',
  description: '',
  pricing: '',
  walletAddress: '',
  x402Enabled: true,
};

export default function RegisterProviderPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ agentId: string; registryId: string; txHash?: string } | null>(null);
  const [error, setError] = useState('');

  const set = <K extends keyof FormData>(key: K, val: FormData[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const canProceed = () => {
    switch (step) {
      case 0: return form.name.trim().length >= 2 && form.category;
      case 1: return form.endpoint.trim().startsWith('http');
      case 2: return true; // pricing + wallet optional
      default: return true;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3100'}/v1/providers/register`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': localStorage.getItem('fabric_api_key') || '',
          },
          body: JSON.stringify({
            name: form.name.trim(),
            category: form.category,
            endpoint: form.endpoint.trim(),
            description: form.description.trim(),
            priceUsd: form.pricing ? parseFloat(form.pricing) : undefined,
            walletAddress: form.walletAddress.trim() || undefined,
            x402Enabled: form.x402Enabled,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || 'Registration failed');
      setResult(data);
      setStep(3);
    } catch (err: any) {
      setError(err.message);
    }
    setSubmitting(false);
  };

  const steps = ['Identity', 'Endpoint', 'Pricing', 'Confirm'];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.push('/dashboard/providers')} className="text-fabric-gray-400 hover:text-fabric-gray-900 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold">Register Provider</h1>
          <p className="text-[13px] text-fabric-gray-500 mt-0.5">
            Add your service to the Fabric registry on Base L2
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold transition-colors ${
              i < step ? 'bg-green-500 text-white' :
              i === step ? 'bg-fabric-blue text-white' :
              'bg-fabric-gray-200 text-fabric-gray-500'
            }`}>
              {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-[12px] ${i === step ? 'text-fabric-gray-900 font-medium' : 'text-fabric-gray-400'}`}>
              {label}
            </span>
            {i < steps.length - 1 && <div className="w-8 h-px bg-fabric-gray-200 mx-1" />}
          </div>
        ))}
      </div>

      {/* Step 0: Identity */}
      {step === 0 && (
        <div className="metric-card max-w-2xl">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4" /> Provider Identity
          </h2>

          <div className="mb-4">
            <label className="block text-[11px] uppercase tracking-wider text-fabric-gray-500 mb-2">
              Provider Name *
            </label>
            <input
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Flux Pro, DeepL Agent, Whisper API"
              className="w-full px-4 py-3 bg-fabric-gray-50 border border-fabric-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-fabric-blue"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-fabric-gray-500 mb-2">
              Category *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => set('category', cat.id)}
                  className={`text-left px-4 py-3 rounded-lg border transition-colors ${
                    form.category === cat.id
                      ? 'border-fabric-blue bg-blue-50/50 ring-1 ring-fabric-blue'
                      : 'border-fabric-gray-200 hover:border-fabric-gray-300 hover:bg-fabric-gray-50'
                  }`}
                >
                  <div className="text-[13px] font-medium">{cat.label}</div>
                  <div className="text-[11px] text-fabric-gray-500">{cat.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-[11px] uppercase tracking-wider text-fabric-gray-500 mb-2">
              Description (optional)
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Brief description of what your service does..."
              rows={3}
              className="w-full px-4 py-3 bg-fabric-gray-50 border border-fabric-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-fabric-blue resize-none"
            />
          </div>
        </div>
      )}

      {/* Step 1: Endpoint */}
      {step === 1 && (
        <div className="metric-card max-w-2xl">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4" /> Service Endpoint
          </h2>

          <div className="mb-4">
            <label className="block text-[11px] uppercase tracking-wider text-fabric-gray-500 mb-2">
              API Endpoint URL *
            </label>
            <input
              value={form.endpoint}
              onChange={(e) => set('endpoint', e.target.value)}
              placeholder="https://your-service.com/v1/generate"
              className="w-full px-4 py-3 bg-fabric-gray-50 border border-fabric-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-fabric-blue"
              autoFocus
            />
            <p className="text-[11px] text-fabric-gray-500 mt-2">
              This is the endpoint agents will call when routing requests to your service.
            </p>
          </div>

          <div className="p-4 bg-fabric-gray-50 rounded-lg border border-fabric-gray-200">
            <h3 className="text-[12px] font-semibold mb-2">Endpoint requirements</h3>
            <ul className="text-[11px] text-fabric-gray-600 space-y-1">
              <li>• Must be publicly accessible over HTTPS</li>
              <li>• Should accept POST requests with JSON body</li>
              <li>• Must respond within 30 seconds</li>
              <li>• If x402-enabled: return 402 with payment requirements for paid calls</li>
              <li>• Recommended: return structured JSON responses</li>
            </ul>
          </div>
        </div>
      )}

      {/* Step 2: Pricing & Wallet */}
      {step === 2 && (
        <div className="metric-card max-w-2xl">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4" /> Pricing & Payments
          </h2>

          <div className="mb-4">
            <label className="block text-[11px] uppercase tracking-wider text-fabric-gray-500 mb-2">
              Price per Request (USD)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-fabric-gray-400 text-sm">$</span>
              <input
                type="number"
                step="0.001"
                min="0"
                value={form.pricing}
                onChange={(e) => set('pricing', e.target.value)}
                placeholder="0.020"
                className="w-full pl-8 pr-4 py-3 bg-fabric-gray-50 border border-fabric-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-fabric-blue"
              />
            </div>
            <p className="text-[11px] text-fabric-gray-500 mt-1">Leave blank for free services.</p>
          </div>

          <div className="mb-4">
            <label className="block text-[11px] uppercase tracking-wider text-fabric-gray-500 mb-2">
              Payment Wallet Address (Base)
            </label>
            <input
              value={form.walletAddress}
              onChange={(e) => set('walletAddress', e.target.value)}
              placeholder="0x..."
              className="w-full px-4 py-3 bg-fabric-gray-50 border border-fabric-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-fabric-blue"
            />
            <p className="text-[11px] text-fabric-gray-500 mt-1">
              Where USDC payments will be received. Optional if your service is free.
            </p>
          </div>

          <div className="flex items-center gap-3 p-4 bg-fabric-gray-50 rounded-lg border border-fabric-gray-200">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.x402Enabled}
                onChange={(e) => set('x402Enabled', e.target.checked)}
                className="w-4 h-4 accent-fabric-blue"
              />
              <div>
                <div className="text-[13px] font-medium">Enable x402 protocol</div>
                <div className="text-[11px] text-fabric-gray-500">
                  Your endpoint returns HTTP 402 with payment requirements. Fabric handles the rest.
                </div>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Step 3: Success */}
      {step === 3 && result && (
        <div className="metric-card max-w-2xl text-center py-8">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-7 h-7 text-green-600" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Provider Registered</h2>
          <p className="text-[13px] text-fabric-gray-500 mb-6">
            <strong>{form.name}</strong> is now discoverable in the Fabric registry.
          </p>

          <div className="text-left bg-fabric-gray-50 rounded-lg p-4 mb-6 space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-fabric-gray-500 mb-1">Agent ID</div>
              <div className="flex items-center gap-2">
                <code className="text-[12px] font-mono text-fabric-gray-900">{result.agentId}</code>
                <button onClick={() => navigator.clipboard.writeText(result.agentId)} className="text-fabric-gray-400 hover:text-fabric-gray-600">
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-fabric-gray-500 mb-1">Registry ID (bytes32)</div>
              <div className="flex items-center gap-2">
                <code className="text-[12px] font-mono text-fabric-gray-900 break-all">{result.registryId}</code>
                <button onClick={() => navigator.clipboard.writeText(result.registryId)} className="text-fabric-gray-400 hover:text-fabric-gray-600">
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            </div>
            {result.txHash && (
              <div>
                <div className="text-[10px] uppercase tracking-wider text-fabric-gray-500 mb-1">On-chain TX</div>
                <a
                  href={`https://sepolia.basescan.org/tx/${result.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[12px] text-fabric-blue hover:underline font-mono"
                >
                  {result.txHash.slice(0, 10)}...{result.txHash.slice(-8)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          <div className="space-y-3 text-left mb-6">
            <h3 className="text-[12px] font-semibold">What happens next</h3>
            <div className="flex items-start gap-3 text-[12px]">
              <div className="w-5 h-5 bg-fabric-blue/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] text-fabric-blue font-bold">1</span>
              </div>
              <div>
                <strong>Agents can discover you</strong> — your service appears in <code className="text-[11px] bg-fabric-gray-100 px-1 rounded">discover</code> queries for "{form.category}".
              </div>
            </div>
            <div className="flex items-start gap-3 text-[12px]">
              <div className="w-5 h-5 bg-fabric-blue/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] text-fabric-blue font-bold">2</span>
              </div>
              <div>
                <strong>Trust score builds</strong> — as agents interact with your service, your reputation score increases based on uptime, quality feedback, and response times.
              </div>
            </div>
            <div className="flex items-start gap-3 text-[12px]">
              <div className="w-5 h-5 bg-fabric-blue/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] text-fabric-blue font-bold">3</span>
              </div>
              <div>
                <strong>Payments flow</strong> — when agents route requests via x402, USDC payments settle to your wallet on Base.
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <a
              href="/dashboard/providers"
              className="px-6 py-2.5 bg-fabric-gray-900 text-white text-[12px] font-medium rounded-lg hover:bg-fabric-gray-800 transition-colors"
            >
              View in Registry
            </a>
            <button
              onClick={() => { setStep(0); setForm(INITIAL); setResult(null); }}
              className="px-6 py-2.5 border border-fabric-gray-200 text-[12px] font-medium rounded-lg hover:bg-fabric-gray-50 transition-colors"
            >
              Register Another
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-[12px] text-red-700 max-w-2xl">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Navigation */}
      {step < 3 && (
        <div className="flex justify-between mt-6 max-w-2xl">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="flex items-center gap-2 px-4 py-2 text-[12px] text-fabric-gray-500 hover:text-fabric-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {step < 2 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2 bg-fabric-gray-900 text-white text-[12px] font-medium rounded-lg hover:bg-fabric-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !canProceed()}
              className="flex items-center gap-2 px-6 py-2 bg-fabric-blue text-white text-[12px] font-medium rounded-lg hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Register on Base <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
