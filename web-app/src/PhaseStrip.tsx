import { Tooltip } from 'antd'
import { PHASE_GROUPS, PHASE_STATE_LABELS, PhaseKey, PhaseState } from './utils'

/**
 * One cell per edition phase, grouped as in PHASE_GROUPS and coloured by state.
 * A phase that does not apply keeps its (empty) slot, so that the strips of
 * different tonos line up in a list.
 */
const PhaseStrip = ({ phases, showLabels = false, compact = false }:
    { phases: Record<PhaseKey, PhaseState>, showLabels?: boolean, compact?: boolean }) =>
    <div className={`phase-strip${compact ? " compact" : ""}`}>
        {PHASE_GROUPS.map(group =>
            <div className="phase-group" key={group.label}>
                {showLabels ? <div className="phase-group-label">{group.label}</div> : null}
                <div className="phase-cells">
                    {group.phases.map(({ key, label }) => {
                        const state = phases[key] ?? "pending"
                        return state == "n/a"
                            ? <span key={key} className="phase-cell na" />
                            : <Tooltip key={key} title={`${label}: ${PHASE_STATE_LABELS[state]}`}>
                                <span className={`phase-cell ${state}`} aria-label={`${label}: ${PHASE_STATE_LABELS[state]}`} />
                            </Tooltip>
                    })}
                </div>
            </div>
        )}
    </div>

export const PhaseLegend = () =>
    <div className="phase-legend">
        {(["done", "in_progress", "pending"] as PhaseState[]).map(state =>
            <span key={state}><span className={`phase-cell ${state}`} /> {PHASE_STATE_LABELS[state]}</span>)}
    </div>

export default PhaseStrip
