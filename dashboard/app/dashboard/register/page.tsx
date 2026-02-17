'use client';

import { useState } from 'react';
import { Check, Shield, DollarSign, FileCheck } from 'lucide-react';
import Link from 'next/link';
import { registerProvider, ApiError } from '@/lib/api';
import { useTitle } from '@/lib/hooks';

const STEPS = [
  { num: 1, label: 'Identity' },
  { num: 2, label: 'Endpoint' },
  { num: 3, label: 'Pricing' },
  { num: 4, label: 'Confirm' },
];

const CATEGORIES = [
  { value: 'Image Generation', desc: 'DALL-E, Flux, Midjourney, Stable Diffusion' },
  { value: 'Translation', desc: 'DeepL, Google Translate, multi-language' },
  { value: 'Transcription', desc: 'Whisper, AssemblyAI, audio-to-text' },
  { value: 'Code Review', desc: 'Automated review, linting, vulnerability scan' },
  { value: 'Data Analysis', desc: 'Analytics, sentiment, classification' },
  { value: 'Text Generation', desc: 'LLMs, summarisation, content creation' },
  { value: 'Embedding', desc: 'Vector embeddings for RAG, search, similarity' },
  { value: 'Search', desc: 'Web search, knowledge retrieval, indexing' },
];

const PRICING_MODELS = [
  { value: 'per_request', label: 'Per Request' },
  { value: 'per_token', label: 'Per Token' },
  { value: 'flat_monthly', label: 'Flat Monthly' },
];

export default function RegisterPage() {
  useTitle('Register Provider');
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const [providerName, setProviderName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');

  const [endpointUrl, setEndpointUrl] = useState('');
  const [healthCheckPath, setHealthCheckPath] = useState('');
  const [requiresAuth, setRequiresAuth] = useState(false);

  const [pricingModel, setPricingModel] = useState('per_request');
  const [price, setPrice] = useState('');

  const [registered, setRegistered] = useState(false);

  const canProceed = () => {
    switch (step) {
      case 1: return providerName.trim() !== '' && category !== '';
      case 2: return endpointUrl.trim() !== '';
      case 3: return price.trim() !== '';
      case 4: return true;
      default: return false;
    }
  };

  const handleRegister = async () => {
    setSubmitting(true);
    setSubmitError('');
    try {
      await registerProvider({
        name: providerName.trim(),
        category,
        description: description.trim() || undefined,
        endpoint: endpointUrl.trim(),
        health_check_path: healthCheckPath.trim() || undefined,
        requires_auth: requiresAuth,
        pricing_model: pricingModel,
        price: parseFloat(price),
      });
      setRegistered(true);
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = typeof err.body === 'object' && err.body && 'error' in (err.body as Record<string, unknown>)
          ? String((err.body as Record<string, string>).error)
          : err.message;
        setSubmitError(msg);
      } else {
        setSubmitError('Registration failed. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setRegistered(false);
    setStep(1);
    setProviderName('');
    setCategory('');
    setDescription('');
    setEndpointUrl('');
    setHealthCheckPath('');
    setRequiresAuth(false);
    setPricingModel('per_request');
    setPrice('');
    setSubmitError('');
  };

  if (registered) {
    return (
      <div>
        <div className="page-header-bar">
          <div>
            <h1>Register Provider</h1>
            <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>Register a new AI service on the Fabric network</p>
          </div>
        </div>
        <div className="page-content animate-fade-in">
          <div className="card" style={{ maxWidth: '640px', margin: '48px auto', textAlign: 'center' }}>
            <div className="card-body" style={{ padding: '48px 24px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--green-subtle)', margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check size={28} style={{ color: 'var(--green)' }} />
              </div>
              <h2 style={{ marginBottom: '8px' }}>Provider Registered</h2>
              <p style={{ fontSize: '14px', color: 'var(--text-2)', marginBottom: '8px' }}><strong>{providerName}</strong> has been submitted to the Fabric registry.</p>
              <p style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '32px' }}>Your provider will appear in the marketplace once verification is complete.</p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <Link href="/dashboard/providers" className="btn-sm" style={{ padding: '10px 24px', fontWeight: 500 }}>View Providers</Link>
                <button className="btn-sm btn-primary-fixed" style={{ padding: '10px 24px', fontWeight: 600 }} onClick={resetForm}>Register Another</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header-bar">
        <div>
          <h1>Register Provider</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', marginTop: '2px' }}>Register a new AI service on the Fabric network</p>
        </div>
      </div>

      <div className="animate-fade-in" style={{ padding: '0 0 48px' }}>
        {/* Wizard steps */}
        <div className="wizard-steps">
          {STEPS.map((s, i) => (
            <div key={s.num} style={{ display: 'contents' }}>
              <div
                className={`wizard-step${step >= s.num ? ' active' : ''}`}
                style={{ cursor: step > s.num ? 'pointer' : 'default' }}
                onClick={() => { if (step > s.num) setStep(s.num); }}
              >
                <div className="wizard-step-num">
                  {step > s.num ? <Check size={14} /> : s.num}
                </div>
                <span>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className="wizard-line" />}
            </div>
          ))}
        </div>

        <div className="page-content">
          {submitError && (
            <div style={{ marginBottom: '16px', padding: '12px 16px', background: 'var(--red-subtle)', borderRadius: '10px', fontSize: '13px', color: 'var(--red)' }}>
              {submitError}
            </div>
          )}

          {/* Step 1: Identity */}
          {step === 1 && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">Provider Identity</span>
              </div>
              <div className="card-body">
                <div className="form-field">
                  <label>Provider Name <span className="required">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Flux Pro, DeepL Agent, Whisper API"
                    value={providerName}
                    onChange={(e) => setProviderName(e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label>Category <span className="required">*</span></label>
                  <div className="category-grid">
                    {CATEGORIES.map((cat) => (
                      <div
                        key={cat.value}
                        className={`category-card${category === cat.value ? ' selected' : ''}`}
                        onClick={() => setCategory(cat.value)}
                      >
                        <h4>{cat.value}</h4>
                        <p>{cat.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-field">
                  <label>Description (optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Brief description of what your service does..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="wizard-footer">
                  <div />
                  <button
                    className="wizard-next"
                    style={{ opacity: canProceed() ? 1 : 0.4, cursor: canProceed() ? 'pointer' : 'default' }}
                    onClick={() => { if (canProceed()) setStep(2); }}
                  >
                    Continue →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Endpoint */}
          {step === 2 && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">
                  <Shield size={16} />
                  Endpoint Configuration
                </span>
              </div>
              <div className="card-body">
                <div className="form-field">
                  <label>Endpoint URL <span className="required">*</span></label>
                  <input
                    type="url"
                    placeholder="https://api.example.com/v1"
                    value={endpointUrl}
                    onChange={(e) => setEndpointUrl(e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label>Health Check Path</label>
                  <input
                    type="text"
                    placeholder="/health"
                    value={healthCheckPath}
                    onChange={(e) => setHealthCheckPath(e.target.value)}
                  />
                  <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '6px' }}>
                    Fabric will periodically ping this endpoint to verify uptime. Leave blank to use the root path.
                  </div>
                </div>

                <div className="form-field" style={{ marginBottom: 0 }}>
                  <label>Authentication</label>
                  <div style={{ padding: '14px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 500 }}>Requires Authentication</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '2px' }}>Enable if your endpoint requires an API key or token</div>
                      </div>
                      <label className="toggle-switch">
                        <input
                          type="checkbox"
                          checked={requiresAuth}
                          onChange={(e) => setRequiresAuth(e.target.checked)}
                        />
                        <span className="toggle-track" />
                        <span className="toggle-knob" />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="wizard-footer">
                  <button className="wizard-back" onClick={() => setStep(1)}>← Back</button>
                  <button
                    className="wizard-next"
                    style={{ opacity: canProceed() ? 1 : 0.4, cursor: canProceed() ? 'pointer' : 'default' }}
                    onClick={() => { if (canProceed()) setStep(3); }}
                  >
                    Continue →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Pricing */}
          {step === 3 && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">
                  <DollarSign size={16} />
                  Pricing Configuration
                </span>
              </div>
              <div className="card-body">
                <div className="form-field">
                  <label>Pricing Model <span className="required">*</span></label>
                  <select
                    value={pricingModel}
                    onChange={(e) => setPricingModel(e.target.value)}
                  >
                    {PRICING_MODELS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>Price (USD) <span className="required">*</span></label>
                  <input
                    type="text"
                    placeholder={pricingModel === 'per_request' ? '0.02' : pricingModel === 'per_token' ? '0.001' : '49.00'}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                  <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '6px' }}>
                    {pricingModel === 'per_request' && 'Price charged per API request in USD.'}
                    {pricingModel === 'per_token' && 'Price charged per token processed in USD.'}
                    {pricingModel === 'flat_monthly' && 'Fixed monthly subscription price in USD.'}
                  </div>
                </div>

                <div className="form-field">
                  <label>Currency</label>
                  <div style={{ padding: '14px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="status-badge" style={{ background: 'var(--blue-subtle)', color: 'var(--blue)' }}>USDC</span>
                      <span style={{ color: 'var(--text-2)', fontSize: '13px' }}>USD Coin on Base L2</span>
                    </div>
                  </div>
                </div>

                <div className="form-field" style={{ marginBottom: 0 }}>
                  <label>Payment Type</label>
                  <div style={{ padding: '14px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="status-badge" style={{ background: 'var(--green-subtle)', color: 'var(--green)' }}>x402</span>
                      <span style={{ color: 'var(--text-2)', fontSize: '13px' }}>HTTP 402-based micropayments</span>
                    </div>
                  </div>
                </div>

                <div className="wizard-footer">
                  <button className="wizard-back" onClick={() => setStep(2)}>← Back</button>
                  <button
                    className="wizard-next"
                    style={{ opacity: canProceed() ? 1 : 0.4, cursor: canProceed() ? 'pointer' : 'default' }}
                    onClick={() => { if (canProceed()) setStep(4); }}
                  >
                    Continue →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 4 && (
            <div className="card">
              <div className="card-header">
                <span className="card-title">
                  <FileCheck size={16} />
                  Review & Confirm
                </span>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                {/* Identity */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-3)' }}>Identity</div>
                    <button style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--blue)', cursor: 'pointer', background: 'none', border: 'none' }} onClick={() => setStep(1)}>Edit</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '2px' }}>Name</div>
                      <div style={{ fontSize: '14px', fontWeight: 500 }}>{providerName}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '2px' }}>Category</div>
                      <div style={{ fontSize: '14px', fontWeight: 500 }}>{category}</div>
                    </div>
                    {description && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '2px' }}>Description</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-2)', lineHeight: 1.5 }}>{description}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Endpoint */}
                <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--bg)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-3)' }}>Endpoint</div>
                    <button style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--blue)', cursor: 'pointer', background: 'none', border: 'none' }} onClick={() => setStep(2)}>Edit</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '2px' }}>URL</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{endpointUrl}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '2px' }}>Health Check</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{healthCheckPath || '/'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '2px' }}>Authentication</div>
                      <span className="status-badge" style={requiresAuth ? { background: 'var(--amber-subtle)', color: 'var(--amber)' } : { background: 'var(--green-subtle)', color: 'var(--green)' }}>
                        {requiresAuth ? 'Required' : 'None'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-3)' }}>Pricing</div>
                    <button style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--blue)', cursor: 'pointer', background: 'none', border: 'none' }} onClick={() => setStep(3)}>Edit</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '2px' }}>Model</div>
                      <div style={{ fontSize: '14px', fontWeight: 500 }}>{PRICING_MODELS.find(m => m.value === pricingModel)?.label}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '2px' }}>Price</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', fontWeight: 600, color: 'var(--green)' }}>${price}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '2px' }}>Currency</div>
                      <span className="status-badge" style={{ background: 'var(--blue-subtle)', color: 'var(--blue)' }}>USDC</span>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '2px' }}>Payment</div>
                      <span className="status-badge" style={{ background: 'var(--green-subtle)', color: 'var(--green)' }}>x402</span>
                    </div>
                  </div>
                </div>

                <div className="wizard-footer" style={{ margin: '0 24px', padding: '20px 0' }}>
                  <button className="wizard-back" onClick={() => setStep(3)}>← Back</button>
                  <button
                    className="wizard-next"
                    style={{ color: 'var(--green)', fontWeight: 600, opacity: submitting ? 0.5 : 1 }}
                    onClick={handleRegister}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <div style={{
                        width: '14px',
                        height: '14px',
                        border: '2px solid var(--border)',
                        borderTopColor: 'var(--green)',
                        borderRadius: '50%',
                        animation: 'spin .6s linear infinite',
                      }} />
                    ) : (
                      <><Check size={14} /> Register on Fabric</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
