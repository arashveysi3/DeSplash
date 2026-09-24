import { Block } from 'baseui/block';
import { Button, KIND, SHAPE } from 'baseui/button';
import { LabelSmall, ParagraphSmall } from 'baseui/typography';
import UberCard from '../cards/UberCard.jsx';
import { StatTile, AccuracyBar, LektionPerfRow, StrengthCallout, RecommendationBox, SectionLabel, fmtPct, accuracyColor } from './shared.jsx';

const MODE_LABELS = { dictation: 'Dictation', artikel: 'Artikel', mixed: 'Mixed', choice: '4-Choice', fa: 'DE → فارسی' };

/**
 * Quiz completion performance report (Issue #2 §1).
 * Pure presentational component — all math comes from calcQuizReport().
 */
export default function QuizReport({ report, meta = {}, actions = {} }) {
  if (!report || report.total === 0) {
    return (
      <UberCard styleOverride={{ textAlign: 'center', paddingTop: 24, paddingBottom: 24 }}>
        <div style={{ fontSize: 32 }}>📊</div>
        <div style={{ fontWeight: 800, fontSize: 15, marginTop: 8 }}>No questions answered</div>
        <ParagraphSmall color="#6b6b6b" margin="6px 0 0">Start a quiz to get your performance report.</ParagraphSmall>
        <Block display="flex" gridGap="8px" justifyContent="center" marginTop="12px">
          {actions.onNewQuiz && <Button shape={SHAPE.pill} onClick={actions.onNewQuiz}>New quiz</Button>}
          {actions.onGoToBook && <Button kind={KIND.secondary} shape={SHAPE.pill} onClick={actions.onGoToBook}>Back to book</Button>}
        </Block>
      </UberCard>
    );
  }

  const { onRetake, onNewQuiz, onGoToBook, onPracticeWeak, onPracticeLektion } = actions;
  const modeLabel = MODE_LABELS[meta.mode] || meta.mode || 'Quiz';
  const scopeLabel = meta.scopeLabel || '';
  const passed = report.accuracy !== null && report.accuracy >= 60;

  return (
    <Block display="flex" flexDirection="column" gridGap="12px">
      {/* Result overview */}
      <UberCard styleOverride={{ textAlign: 'center', paddingTop: 20, paddingBottom: 18 }}>
        <div className="gs-report-item" style={{ fontSize: 40 }}>{passed ? '🎉' : report.accuracy !== null && report.accuracy < 40 ? '💪' : '📊'}</div>
        <LabelSmall color="#6b6b6b">{modeLabel} complete{scopeLabel ? ` • ${scopeLabel}` : ''}</LabelSmall>
        <div className="gs-report-item" style={{ fontWeight: 800, fontSize: 34, marginTop: 4, color: accuracyColor(report.accuracy), animationDelay: '60ms' }}>
          {fmtPct(report.accuracy)}
        </div>
        <div className="gs-report-item" style={{ fontSize: 13, color: '#6b6b7a', marginTop: 2, animationDelay: '100ms' }}>
          {report.correct}/{report.total} correct • +{report.xp} XP
        </div>
        <Block marginTop="12px">
          <AccuracyBar value={report.accuracy} height={8} delay={150} />
        </Block>
        <div className="gs-report-item gs-stats-grid" style={{ marginTop: 12, paddingBottom: 6, animationDelay: '140ms' }}>
          <StatTile value={report.total} label="Questions" delay={140} />
          <StatTile value={report.correct} label="Correct" color="#16a34a" delay={180} />
          <StatTile value={report.incorrect} label="Missed" color={report.incorrect > 0 ? '#dc2626' : '#0f0f12'} delay={220} />
          <StatTile value={`+${report.xp}`} label="XP earned" delay={260} />
        </div>
      </UberCard>

      {/* Lektion performance */}
      {report.hasLektionData ? (
        <UberCard>
          <SectionLabel>LEKTION PERFORMANCE</SectionLabel>
          <Block display="flex" flexDirection="column" gridGap="8px" marginTop="10px">
            {report.perLektion.filter((e) => e.key !== '__unassigned__').map((e, i) => (
              <LektionPerfRow key={e.key} entry={e} index={i} onPractice={onPracticeLektion} />
            ))}
          </Block>
          {report.unassigned && (
            <ParagraphSmall color="#9aa0b2" margin="8px 0 0">
              + {report.unassigned.questions} question{report.unassigned.questions === 1 ? '' : 's'} without Lektion metadata (not counted above).
            </ParagraphSmall>
          )}
        </UberCard>
      ) : (
        <UberCard>
          <SectionLabel>LEKTION PERFORMANCE</SectionLabel>
          <ParagraphSmall color="#6b6b6b" margin="8px 0 0">
            These questions had no Lektion metadata, so per-Lektion breakdown isn&apos;t available — your overall score above still counts.
          </ParagraphSmall>
        </UberCard>
      )}

      {/* Strongest / weakest */}
      {(report.strongest || report.weakest) && (
        <UberCard>
          <SectionLabel>STRENGTHS & FOCUS</SectionLabel>
          <Block marginTop="10px">
            <StrengthCallout strongest={report.strongest} weakest={report.weakest} delay={80} />
          </Block>
          {report.needsPractice.length > 0 && (
            <Block marginTop="10px">
              <LabelSmall color="#6b6b6b">Words to review</LabelSmall>
              <div style={{ fontSize: 12, color: '#0f0f12', marginTop: 4 }}>
                {report.needsPractice.map((e) => `${e.label} (${e.incorrect} missed)`).join(' • ')}
              </div>
            </Block>
          )}
        </UberCard>
      )}

      {/* Recommendation */}
      <UberCard>
        <Block display="flex" flexDirection="column" gridGap="8px">
          <RecommendationBox recommendation={report.recommendation} delay={120} />
        </Block>
      </UberCard>

      {/* Next actions — reuse app routing via callbacks */}
      <UberCard styleOverride={{ backgroundColor: '#f7f7fb', borderColor: '#e9e8f0' }}>
        <SectionLabel>WHAT&apos;S NEXT?</SectionLabel>
        <Block display="flex" gridGap="8px" marginTop="10px" overrides={{ Block: { style: { flexWrap: 'wrap' } } }}>
          {onPracticeLektion && report.recommendation?.focusLektion && (
            <Button shape={SHAPE.pill} onClick={() => onPracticeLektion(report.recommendation.focusLektion)}>
              Practice {report.recommendation.focusLektion} →
            </Button>
          )}
          {onPracticeWeak && <Button shape={SHAPE.pill} kind={report.recommendation?.focusLektion ? KIND.secondary : KIND.primary} onClick={onPracticeWeak}>Review weak words</Button>}
          {onRetake && <Button kind={KIND.secondary} shape={SHAPE.pill} onClick={onRetake}>Retake quiz</Button>}
          {onNewQuiz && <Button kind={KIND.secondary} shape={SHAPE.pill} onClick={onNewQuiz}>New quiz</Button>}
          {onGoToBook && <Button kind={KIND.secondary} shape={SHAPE.pill} onClick={onGoToBook}>Back to book</Button>}
        </Block>
      </UberCard>
    </Block>
  );
}
