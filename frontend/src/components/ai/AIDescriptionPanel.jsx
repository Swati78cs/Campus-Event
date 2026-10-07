import React, { useState } from 'react';
import { Sparkles, Loader2, Check, RefreshCw, X, AlertCircle, Info } from 'lucide-react';
import { generateAIDescription, generateAIDescriptionForEvent } from '../../services/aiService';
import { fromISTLocalToUTC } from '../../utils/dateUtils';

/**
 * AIDescriptionPanel
 * Distinct violet-themed AI assistant for drafting event descriptions with Google Gemini.
 *
 * Rules strictly enforced:
 * 1. AI is used ONLY for description generation.
 * 2. Requires organizer review/edit/approval (never auto-saves or auto-applies).
 * 3. Graceful fallback if Gemini fails or is unconfigured.
 */
export default function AIDescriptionPanel({
  title,
  clubId,
  eventId,
  category,
  venue,
  startDateTimeIST,
  endDateTimeIST,
  onApplyDescription,
  currentDescription,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [audience, setAudience] = useState('');
  const [highlights, setHighlights] = useState('');
  const [extraDetails, setExtraDetails] = useState('');
  const [generatedText, setGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [appliedNotification, setAppliedNotification] = useState(false);

  const handleGenerate = async () => {
    setError(null);
    setAppliedNotification(false);

    if (!title || title.trim().length === 0) {
      setError('Please provide an Event Title first so Gemini can craft a relevant description.');
      return;
    }

    setIsGenerating(true);
    try {
      const payload = {
        title: title.trim(),
        category: category || 'Technical',
        venue: venue?.trim() || undefined,
        audience: audience.trim() || undefined,
        highlights: highlights.trim() || undefined,
        details: extraDetails.trim() || undefined,
      };

      if (clubId) payload.clubId = clubId;
      if (eventId) payload.eventId = eventId;

      if (startDateTimeIST) {
        try {
          payload.startDateTime = fromISTLocalToUTC(startDateTimeIST);
        } catch {
          // ignore date parse error
        }
      }
      if (endDateTimeIST) {
        try {
          payload.endDateTime = fromISTLocalToUTC(endDateTimeIST);
        } catch {
          // ignore date parse error
        }
      }

      let res;
      if (eventId) {
        res = await generateAIDescriptionForEvent(eventId, payload);
      } else {
        res = await generateAIDescription(payload);
      }

      if (res?.description) {
        setGeneratedText(res.description);
      } else {
        throw new Error('No description returned by AI service.');
      }
    } catch (err) {
      const msg = err.message || 'Unable to generate description with Gemini.';
      setError(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (!generatedText) return;
    onApplyDescription(generatedText);
    setAppliedNotification(true);
    setTimeout(() => setAppliedNotification(false), 4000);
  };

  const handleDiscard = () => {
    setGeneratedText('');
    setError(null);
    setAppliedNotification(false);
  };

  return (
    <div
      style={{
        marginTop: 'var(--space-2)',
        marginBottom: 'var(--space-4)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid #DDD6FE',
        backgroundColor: '#F5F3FF',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-3) var(--space-4)',
          backgroundColor: '#EDE9FE',
          borderBottom: isOpen ? '1px solid #DDD6FE' : 'none',
          cursor: 'pointer',
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <Sparkles size={18} color="#7C3AED" />
          <span style={{ fontWeight: 600, color: '#5B21B6', fontSize: '14px' }}>
            Gemini AI Description Assistant
          </span>
          <span
            style={{
              fontSize: '11px',
              backgroundColor: '#DDD6FE',
              color: '#4C1D95',
              padding: '2px 8px',
              borderRadius: '999px',
              fontWeight: 500,
            }}
          >
            AI Draft Helper
          </span>
        </div>
        <button
          type="button"
          style={{
            background: 'none',
            border: 'none',
            color: '#6D28D9',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            padding: '4px 8px',
          }}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
        >
          {isOpen ? 'Hide Assistant' : '✨ Generate with Gemini'}
        </button>
      </div>

      {isOpen && (
        <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <p style={{ fontSize: '13px', color: '#4B5563', margin: 0 }}>
            Generate a comprehensive, engaging event description based on your event title and details.
            You can review, edit, and approve the text before applying it to your event.
          </p>

          {/* Optional Prompts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                Target Audience (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. All engineering students, beginners welcome"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid #D1D5DB',
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
                Key Highlights / Perks (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Certificates provided, cash prizes, hands-on labs"
                value={highlights}
                onChange={(e) => setHighlights(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid #D1D5DB',
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>
              Special Rules / Agenda / Extra Notes (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Bring your own laptop, 24-hour hackathon, team size 2-4"
              value={extraDetails}
              onChange={(e) => setExtraDetails(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid #D1D5DB',
                fontSize: '13px',
                backgroundColor: '#FFFFFF',
              }}
            />
          </div>

          {/* Generate Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerate}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: isGenerating ? '#9CA3AF' : '#7C3AED',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.15s ease',
              }}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Generating with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>{generatedText ? 'Regenerate Draft' : 'Generate with Gemini'}</span>
                </>
              )}
            </button>
            <span style={{ fontSize: '12px', color: '#6B7280' }}>
              Using: {title ? `"${title}"` : '(Please provide title above)'}
            </span>
          </div>

          {/* Error Message & Manual Fallback */}
          {error && (
            <div
              style={{
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#991B1B',
                fontSize: '13px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                <AlertCircle size={16} />
                <span>AI Generation Notice</span>
              </div>
              <div>{error}</div>
              <div style={{ fontSize: '12px', color: '#B91C1C', marginTop: '2px' }}>
                💡 Manual Fallback: You can always write or edit the description directly in the form below without AI.
              </div>
            </div>
          )}

          {/* Generated Text Review & Edit Area */}
          {generatedText && (
            <div
              style={{
                marginTop: 'var(--space-2)',
                padding: 'var(--space-3)',
                backgroundColor: '#FFFFFF',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid #DDD6FE',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-2)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#5B21B6', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Sparkles size={14} color="#7C3AED" />
                  AI Generated Draft (Review &amp; Edit before applying)
                </span>
                <span style={{ fontSize: '11px', color: '#6B7280' }}>
                  {generatedText.length} characters
                </span>
              </div>

              <textarea
                rows={6}
                value={generatedText}
                onChange={(e) => setGeneratedText(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <button
                    type="button"
                    onClick={handleApply}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#059669',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      padding: '7px 14px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Check size={15} />
                    <span>Apply to Description</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDiscard}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: 'transparent',
                      color: '#6B7280',
                      border: '1px solid #D1D5DB',
                      borderRadius: 'var(--radius-sm)',
                      padding: '6px 12px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={14} />
                    <span>Discard Draft</span>
                  </button>
                </div>

                {appliedNotification && (
                  <span style={{ fontSize: '12px', color: '#059669', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={14} /> Applied to Event Description! (Review and click Create/Save when ready)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
