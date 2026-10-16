import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { levelTag, loadLevels } from "../utils/levels";
import { totalStars } from "../utils/storage";
import { useGameStore } from "../utils/store";
import { palette } from "../utils/colors";
import { ArrowDownIcon, BoltIcon, LockIcon, SkullIcon, StarIcon } from "./Icons";

/*
 * Level map: a winding road climbing from the bottom, one chapter (100 levels) at a
 * time, with a sign at the top leading to the next chapter. Levels never run out, so
 * only the current chapter is in the DOM: 100 buttons and one SVG road.
 */

const PER_CHAPTER = 100;
const WIDTH = 340;          // road column width (px); centred on wider screens
const STEP = 96;            // vertical distance between levels
const SWING = 104;          // how far the road swings left/right of centre
const PAD_TOP = 200;        // room for the next-chapter sign
const PAD_BOTTOM = 140;     // room for the start / previous-chapter sign

const chapterOf = (id) => Math.floor((id - 1) / PER_CHAPTER);

// Road geometry for one chapter: node positions and the SVG paths through them.
const buildRoad = (count, doneCount) => {
    const height = PAD_TOP + (count - 1) * STEP + PAD_BOTTOM;
    const points = Array.from({ length: count }, (_, i) => ({
        x: WIDTH / 2 + SWING * Math.sin(i * 0.62),
        y: height - PAD_BOTTOM - i * STEP,
    }));

    // Smooth S-bends: vertical tangents at every node.
    const path = (pts) => pts.reduce((d, p, i) => {
        if (i === 0) return `M ${p.x} ${p.y}`;
        const prev = pts[i - 1];
        const midY = (prev.y + p.y) / 2;
        return `${d} C ${prev.x} ${midY}, ${p.x} ${midY}, ${p.x} ${p.y}`;
    }, '');

    const start = { x: points[0].x, y: height };
    const end = { x: WIDTH / 2, y: PAD_TOP - 90 };
    const full = path([start, ...points, end]);
    const done = doneCount > 0 ? path([start, ...points.slice(0, doneCount)]) : null;

    // Roadside decorations every few levels, on the outside of each bend.
    const decor = points
        .map((p, i) => ({ p, i }))
        .filter(({ i }) => i % 3 === 1)
        .map(({ p, i }) => {
            const side = p.x > WIDTH / 2 ? -1 : 1;
            return {
                x: Math.min(WIDTH - 24, Math.max(24, p.x + side * (70 + (i % 4) * 8))),
                y: p.y + ((i * 37) % 30) - 15,
                shape: ['circle', 'square', 'ring'][i % 3],
                color: palette[(i * 5) % palette.length],
                size: 14 + (i % 4) * 4,
            };
        });

    return { height, points, full, done, decor };
}

const Stars = ({ count }) => (
    <span className="node-stars">
        {[1, 2, 3].map(i => <StarIcon key={i} size={12} className={i <= count ? 'is-on' : ''} />)}
    </span>
);

const RoadNode = ({ id, tag, x, y, stars, unlocked, onPlay }) => {
    const locked = id > unlocked;
    const current = id === unlocked;
    const classes = ['level-node', 'road-node', `is-${tag}`, locked && 'is-locked', current && 'is-current', stars > 0 && 'is-done']
        .filter(Boolean).join(' ');
    return (
        <button
            className={classes}
            style={{ left: x, top: y }}
            disabled={locked}
            onClick={() => onPlay(id)}
            data-level={id}
            aria-label={`Level ${id}${locked ? ', locked' : ''}${tag !== 'normal' ? `, ${tag === 'hard' ? 'hard' : 'super hard'}` : ''}${stars ? `, ${stars} stars` : ''}`}
        >
            {current && <span className="node-marker">Play</span>}
            {tag === 'hard' && <span className="node-badge"><BoltIcon size={12} /></span>}
            {tag === 'superHard' && <span className="node-badge"><SkullIcon size={12} /></span>}
            <span className="node-circle">{locked ? <LockIcon size={18} /> : id}</span>
            {!locked && <Stars count={stars} />}
        </button>
    );
}

const LevelMap = () => {
    const progress = useGameStore(s => s.progress);
    const playLevel = useGameStore(s => s.playLevel);
    const { unlocked, stars } = progress;

    const [levels, setLevels] = useState(null);
    const [error, setError] = useState(false);
    const [chapter, setChapter] = useState(() => chapterOf(unlocked));
    // Where to scroll after the chapter renders: the current level, or the chapter's start/end.
    const scrollTo = useRef('current');
    const listRef = useRef(null);

    useEffect(() => {
        loadLevels().then(setLevels).catch(() => setError(true));
    }, []);

    const first = chapter * PER_CHAPTER + 1;
    const last = first + PER_CHAPTER - 1;
    const doneCount = Math.min(PER_CHAPTER, Math.max(0, unlocked - first));
    const road = useMemo(() => buildRoad(PER_CHAPTER, doneCount), [doneCount]);

    useLayoutEffect(() => {
        const list = listRef.current;
        if (!levels || !list) return;
        if (scrollTo.current === 'current' && chapterOf(unlocked) === chapter) {
            list.querySelector(`[data-level="${unlocked}"]`)?.scrollIntoView({ block: 'center', behavior: 'instant' });
        } else if (scrollTo.current === 'end') {
            list.scrollTop = 0;
        } else {
            list.scrollTop = list.scrollHeight;
        }
    }, [levels, chapter]);

    const goChapter = (next) => {
        scrollTo.current = next > chapter ? 'start' : 'end';
        setChapter(next);
    };

    // "Back to your level" button: shown while the current level is off-screen, with the
    // arrow pointing the way to it (another chapter counts as off-screen too).
    const [jump, setJump] = useState(null);     // null | 'up' | 'down'
    const currentChapter = chapterOf(unlocked);

    const updateJump = () => {
        const list = listRef.current;
        if (!list || !levels) return setJump(null);
        if (currentChapter !== chapter) return setJump(currentChapter > chapter ? 'up' : 'down');
        const node = list.querySelector(`[data-level="${unlocked}"]`);
        if (!node) return setJump(null);
        const view = list.getBoundingClientRect();
        const box = node.getBoundingClientRect();
        setJump(box.bottom < view.top ? 'up' : box.top > view.bottom ? 'down' : null);
    };

    const frame = useRef(0);
    const onScroll = () => {
        cancelAnimationFrame(frame.current);
        frame.current = requestAnimationFrame(updateJump);
    };
    useEffect(() => () => cancelAnimationFrame(frame.current), []);
    useEffect(updateJump, [levels, chapter, unlocked]);

    const jumpToCurrent = () => {
        if (currentChapter !== chapter) {
            scrollTo.current = 'current';
            setChapter(currentChapter);
            return;
        }
        listRef.current?.querySelector(`[data-level="${unlocked}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    };

    const nextOpen = unlocked > last;

    return (
        <div className="map">
            <div className="tab-title-row">
                <div>
                    <h2 className="tab-title">Chapter {chapter + 1}</h2>
                    <span className="tab-sub">Levels {first}–{last}</span>
                </div>
                <span className="map-total"><StarIcon size={16} /> {totalStars(progress)}</span>
            </div>

            {jump && (
                <button className={`jump-btn is-${jump}`} onClick={jumpToCurrent} aria-label={`Go to your level, level ${unlocked}`}>
                    <ArrowDownIcon size={18} />
                    Level {unlocked}
                </button>
            )}

            <div className="map-list" ref={listRef} onScroll={onScroll}>
                {error && <p className="map-empty">Couldn't load levels.</p>}
                {levels && (
                    <div className="road" style={{ width: WIDTH, height: road.height }}>
                        <svg className="road-svg" width={WIDTH} height={road.height} aria-hidden="true">
                            <path className="road-edge" d={road.full} />
                            <path className="road-base" d={road.full} />
                            {road.done && <path className="road-done" d={road.done} />}
                            <path className="road-dash" d={road.full} />
                        </svg>

                        {road.decor.map((d, i) => (
                            <span
                                key={i}
                                className={`road-decor is-${d.shape}`}
                                style={{ left: d.x, top: d.y, width: d.size, height: d.size, '--c': d.color }}
                                aria-hidden="true"
                            />
                        ))}

                        <div className={`road-sign is-top ${nextOpen ? 'is-open' : ''}`} style={{ top: 24 }}>
                            <span className="sign-kicker">Next chapter</span>
                            <strong>Chapter {chapter + 2}</strong>
                            <span className="sign-sub">Levels {last + 1}–{last + PER_CHAPTER}</span>
                            {nextOpen
                                ? <button className="btn btn-primary sign-btn" onClick={() => goChapter(chapter + 1)}>Go</button>
                                : <span className="sign-lock"><LockIcon size={14} /> Reach level {last + 1}</span>}
                        </div>

                        {road.points.map((p, i) => {
                            const id = first + i;
                            return (
                                <RoadNode
                                    key={id}
                                    id={id}
                                    tag={levelTag(levels, id)}
                                    x={p.x}
                                    y={p.y}
                                    stars={stars[id] ?? 0}
                                    unlocked={unlocked}
                                    onPlay={playLevel}
                                />
                            );
                        })}

                        <div className="road-sign is-bottom" style={{ top: road.height - 62 }}>
                            {chapter > 0
                                ? <button className="btn btn-secondary sign-btn" onClick={() => goChapter(chapter - 1)}>↓ Chapter {chapter}</button>
                                : <span className="sign-start">Start</span>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LevelMap;
