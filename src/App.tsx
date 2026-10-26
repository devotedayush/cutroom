import { useState, useRef, useEffect, useCallback } from "react";
import {
  Plus,
  Upload,
  Play,
  Pause,
  SkipBack,
  Scissors,
  Trash2,
  Undo2,
  Redo2,
  Download,
  FolderOpen,
  Save,
  ChevronLeft,
  ChevronRight,
  X,
  Film,
  Image as ImageIcon,
  ArrowUpRight,
  Check,
  LoaderCircle,
  Volume2,
  PanelRightClose,
} from "lucide-react";
import {
  type Asset,
  type Clip,
  type Project,
  type Ratio,
  DEFAULT_PROJECT,
  createClip,
  clipDuration,
  projectDuration,
  locateClip,
  clipStart,
  splitClip,
  moveClip,
  formatTime,
  dimensions,
  MAX_DURATION,
} from "./model";
import { importMedia } from "./media/import";
import { createDemoMedia } from "./media/demo";
import { drawComposition } from "./render";
import { exportProject, getExportCapabilities } from "./media/export";
import {
  serializeProject,
  parseProject,
  relinkAssets,
  downloadBlob,
} from "./storage";
import "./styles.css";

export default function App() {
  const [project, setProject] = useState<Project>({ ...DEFAULT_PROJECT });
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selected, setSelected] = useState("");
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const assetRegistry = useRef<Asset[]>([]);
  const [past, setPast] = useState<Project[]>([]);
  const [future, setFuture] = useState<Project[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dragging, setDragging] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [relinkOpen, setRelinkOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [format, setFormat] = useState<"webm" | "mp4">("webm");
  const [capabilities, setCapabilities] = useState({ webm: true, mp4: false });
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<{ blob: Blob; filename: string } | null>(
    null,
  );
  const [resultUrl, setResultUrl] = useState("");
  const [mobileTab, setMobileTab] = useState<"media" | "inspector">("media");
  const fileInput = useRef<HTMLInputElement>(null),
    projectInput = useRef<HTMLInputElement>(null),
    relinkInput = useRef<HTMLInputElement>(null);
  const pending = useRef<
      (ReturnType<typeof parseProject> & { restoredDemo?: Asset[] }) | null
    >(null),
    canvas = useRef<HTMLCanvasElement>(null),
    video = useRef<HTMLVideoElement>(null),
    image = useRef<HTMLImageElement>(null),
    abort = useRef<AbortController | null>(null);
  const duration = projectDuration(project),
    point = locateClip(project.clips, time),
    current = point
      ? assets.find((a) => a.id === point.clip.assetId)
      : undefined;
  const selectedClip = project.clips.find((c) => c.id === selected),
    selectedAsset = assets.find((a) => a.id === selectedClip?.assetId);
  useEffect(() => {
    assetRegistry.current = assets;
  }, [assets]);
  useEffect(() => {
    const input = relinkInput.current;
    const cancel = () => {
      setNotice("No files selected. You can choose the original files again.");
    };
    input?.addEventListener("cancel", cancel);
    return () => {
      input?.removeEventListener("cancel", cancel);
      assetRegistry.current.forEach((a) => URL.revokeObjectURL(a.url));
      pending.current?.restoredDemo?.forEach((a) => URL.revokeObjectURL(a.url));
    };
  }, []);
  function clearPending() {
    pending.current?.restoredDemo?.forEach((a) => URL.revokeObjectURL(a.url));
    pending.current = null;
  }
  useEffect(() => {
    if (selected && !project.clips.some((c) => c.id === selected))
      setSelected("");
  }, [project, selected]);
  function restoreDocument(next: Project, restored: Asset[]) {
    const retained = new Set(restored.map((a) => a.url));
    assets.forEach((a) => {
      if (!retained.has(a.url)) URL.revokeObjectURL(a.url);
    });
    setAssets(restored);
    assetRegistry.current = restored;
    setProject(next);
    setPast([]);
    setFuture([]);
    setResult(null);
    setPlaying(false);
    setTime(0);
    setSelected(next.clips[0]?.id || "");
  }
  const commit = useCallback(
    (next: Project) => {
      if (next === project) return;
      setPast((p) => [...p.slice(-49), project]);
      setProject(next);
      setFuture([]);
      setResult(null);
    },
    [project],
  );
  function updateClip(patch: Partial<Clip>) {
    if (selectedClip)
      commit({
        ...project,
        clips: project.clips.map((c) =>
          c.id === selected ? { ...c, ...patch } : c,
        ),
      });
  }
  function undo() {
    if (!past.length) return;
    setFuture((f) => [project, ...f]);
    setProject(past[past.length - 1]);
    setPast((p) => p.slice(0, -1));
    setPlaying(false);
  }
  function redo() {
    if (!future.length) return;
    setPast((p) => [...p, project]);
    setProject(future[0]);
    setFuture((f) => f.slice(1));
    setPlaying(false);
  }
  function remove() {
    if (!selected) return;
    commit({
      ...project,
      clips: project.clips.filter((c) => c.id !== selected),
    });
    setSelected("");
    setPlaying(false);
  }
  function add(asset: Asset) {
    const clip = createClip(asset);
    if (duration + clipDuration(clip) > MAX_DURATION) {
      setError(
        "Projects can be up to 3 minutes. Trim an existing clip before adding more.",
      );
      return;
    }
    commit({ ...project, clips: [...project.clips, clip] });
    setSelected(clip.id);
    setTime(duration);
  }
  async function loadFiles(files: File[]) {
    if (progress !== null || !files.length) return;
    setError("");
    setBusy("Importing media…");
    const added: Asset[] = [];
    let failures: string[] = [];
    for (const file of files) {
      try {
        added.push(await importMedia(file));
      } catch (e) {
        failures.push(
          `${file.name}: ${e instanceof Error ? e.message : "Could not import this file"}`,
        );
      }
    }
    setAssets((a) => [...a, ...added]);
    setBusy("");
    if (failures.length) setError(failures.join("\n"));
    if (added.length)
      setNotice(
        `${added.length} file${added.length === 1 ? "" : "s"} ready. Add media to your timeline.`,
      );
  }
  async function demo() {
    setBusy("Creating your demo…");
    setError("");
    try {
      const list = await createDemoMedia();
      setAssets((a) => [...a, ...list]);
      const clips = list.map((a, i) => ({
        ...createClip(a),
        title:
          ["MAKE SOMETHING", "WORTH WATCHING", "YOUR STORY. YOUR CUT."][i] ||
          "",
        titlePosition: "bottom" as const,
        titleSize: 48,
      }));
      commit({ ...project, name: "A little momentum", clips });
      setSelected(clips[0]?.id || "");
      setTime(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Demo could not be created.");
    } finally {
      setBusy("");
    }
  }
  useEffect(() => {
    getExportCapabilities()
      .then((value) => {
        setCapabilities(value);
        if (!value.webm && value.mp4) setFormat("mp4");
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!result) {
      setResultUrl("");
      return;
    }
    const url = URL.createObjectURL(result.blob);
    setResultUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [result]);
  useEffect(() => {
    if (!exportOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const modal = document.querySelector<HTMLElement>(".export-modal");
    modal
      ?.querySelector<HTMLElement>(
        "button:not(:disabled),select:not(:disabled),a[href]",
      )
      ?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === "Escape" && progress === null) {
        setExportOpen(false);
        return;
      }
      if (e.key === "Tab" && modal) {
        const fields = Array.from(
          modal.querySelectorAll<HTMLElement>(
            "button:not(:disabled),select:not(:disabled),a[href],video[controls]",
          ),
        );
        const first = fields[0],
          last = fields.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [exportOpen, progress === null, resultUrl]);
  useEffect(() => {
    if (time > duration) setTime(duration);
  }, [duration, time]);
  useEffect(() => {
    if (!playing) return;
    let frame: number;
    let previous = performance.now();
    function tick(now: number) {
      const delta = (now - previous) / 1000;
      previous = now;
      setTime((t) => {
        if (t + delta >= duration) {
          setPlaying(false);
          return duration;
        }
        return t + delta;
      });
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, duration]);
  useEffect(() => {
    const element = video.current;
    if (!element || current?.kind !== "video" || !point) return;
    if (
      Math.abs(element.currentTime - point.sourceTime) >
      (playing ? 0.15 : 1 / 120)
    )
      element.currentTime = point.sourceTime;
    element.volume = point.clip.volume;
    if (playing) element.play().catch(() => setPlaying(false));
    else element.pause();
  }, [time, playing, current?.id, point?.clip.id, point?.clip.volume]);
  useEffect(() => {
    let frame: number;
    function paint() {
      const c = canvas.current,
        source = current?.kind === "video" ? video.current : image.current;
      if (c && source && point && current) {
        const ctx = c.getContext("2d");
        if (
          ctx &&
          ((source instanceof HTMLVideoElement && source.readyState >= 2) ||
            (source instanceof HTMLImageElement &&
              source.complete &&
              source.naturalWidth))
        ) {
          drawComposition(
            ctx,
            source,
            current.width,
            current.height,
            point.clip,
            c.width,
            c.height,
          );
        }
      }
      frame = requestAnimationFrame(paint);
    }
    frame = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(frame);
  }, [current, point?.clip, project.ratio]);
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (
        (e.target as HTMLElement).matches(
          "input,textarea,select,[contenteditable]",
        ) ||
        exportOpen
      )
        return;
      if (e.code === "Space") {
        e.preventDefault();
        if (duration) {
          if (time >= duration) setTime(0);
          setPlaying((p) => !p);
        }
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        remove();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
      if (e.key === "ArrowRight")
        setTime((t) => Math.min(duration, t + 1 / 30));
      if (e.key === "ArrowLeft") setTime((t) => Math.max(0, t - 1 / 30));
    }
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [project, selected, past, future, time, duration, exportOpen]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  async function openProject(file: File) {
    clearPending();
    setRelinkOpen(false);
    setError("");
    setPlaying(false);
    let generated: Asset[] = [];
    let transferred = false;
    try {
      const parsed = parseProject(await file.text());
      const demoRefs = parsed.media.filter((ref) => ref.demo);
      let restoredDemo: Asset[] = [];
      if (demoRefs.length) {
        setBusy("Recreating demo media…");
        generated = await createDemoMedia();
        restoredDemo = demoRefs.map((ref) => {
          const match = generated.find((a) => a.name === ref.name);
          if (!match)
            throw new Error(
              `The saved demo “${ref.name}” could not be restored.`,
            );
          return { ...match, id: ref.id };
        });
        const used = new Set(restoredDemo.map((a) => a.url));
        generated
          .filter((a) => !used.has(a.url))
          .forEach((a) => URL.revokeObjectURL(a.url));
        generated = generated.filter((a) => used.has(a.url));
      }
      if (parsed.media.every((ref) => ref.demo)) {
        restoreDocument(parsed.project, restoredDemo);
        transferred = true;
        setNotice("Project opened.");
        return;
      }
      pending.current = { ...parsed, restoredDemo };
      transferred = true;
      setRelinkOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not open project.");
    } finally {
      if (!transferred) generated.forEach((a) => URL.revokeObjectURL(a.url));
      setBusy("");
    }
  }
  async function relink(files: File[]) {
    if (!pending.current || !files.length) return;
    setBusy("Reconnecting media…");
    try {
      const restored = await relinkAssets(
        pending.current.media.filter((ref) => !ref.demo),
        files,
      );
      restoreDocument(pending.current.project, [
        ...restored,
        ...(pending.current.restoredDemo || []),
      ]);
      pending.current = null;
      setRelinkOpen(false);
      setNotice("Project opened. Media reconnected.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Some media could not be reconnected.",
      );
    } finally {
      setBusy("");
    }
  }
  async function startExport() {
    setPlaying(false);
    setError("");
    setProgress(0);
    setResult(null);
    abort.current = new AbortController();
    try {
      const output = await exportProject({
        project,
        assets,
        format,
        onProgress: setProgress,
        signal: abort.current.signal,
      });
      setResult(output);
      setProgress(null);
    } catch (e) {
      setProgress(null);
      if (!(e instanceof Error && e.name === "AbortError"))
        setError(e instanceof Error ? e.message : "Export failed.");
    }
  }
  const size = dimensions(project.ratio);
  return (
    <div
      className="studio"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          if (progress === null) setDragging(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node))
          setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (progress !== null) return;
        void loadFiles(Array.from(e.dataTransfer.files));
      }}
    >
      <input
        ref={fileInput}
        type="file"
        accept="video/*,image/*"
        multiple
        hidden
        onChange={(e) => {
          void loadFiles(Array.from(e.target.files || []));
          e.target.value = "";
        }}
      />
      <input
        ref={projectInput}
        type="file"
        accept=".json,.cutroom"
        hidden
        onChange={(e) => {
          if (e.target.files?.[0]) void openProject(e.target.files[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={relinkInput}
        type="file"
        accept="video/*,image/*"
        multiple
        hidden
        onChange={(e) => {
          void relink(Array.from(e.target.files || []));
          e.target.value = "";
        }}
      />
      <header className="topbar">
        <a className="brand" href="#" aria-label="Cutroom home">
          <span className="brand-mark">
            c<span />
          </span>
          cutroom<span className="beta">STUDIO</span>
        </a>
        <div className="project-name">
          <input
            aria-label="Project name"
            value={project.name}
            onChange={(e) => setProject({ ...project, name: e.target.value })}
          />
          <span className="local-dot" />{" "}
          <span className="local-label">Local workspace</span>
        </div>
        <div className="header-actions">
          <button
            className="icon-button"
            title="Open project"
            aria-label="Open project"
            onClick={() => projectInput.current?.click()}
          >
            <FolderOpen size={17} />
          </button>
          <button
            className="icon-button"
            title="Save project file"
            aria-label="Save project file"
            onClick={() => {
              downloadBlob(
                new Blob([serializeProject(project, assets)], {
                  type: "application/json",
                }),
                `${project.name || "project"}.cutroom`,
              );
              setNotice(
                "Project file saved. Keep the original media files for reopening.",
              );
            }}
          >
            <Save size={17} />
          </button>
          <span className="divider" />
          <button
            className="button primary"
            disabled={!project.clips.length || !!busy}
            onClick={() => {
              setExportOpen(true);
              setPlaying(false);
            }}
          >
            <Download size={15} />
            Export video
            <ArrowUpRight size={14} />
          </button>
        </div>
      </header>
      <div className="workbench">
        <aside
          className={`media-panel panel ${mobileTab === "media" ? "mobile-active" : ""}`}
        >
          <div className="panel-heading">
            <h2>Media library</h2>
            <span className="count">{assets.length}</span>
          </div>
          <p className="panel-description">The beginning of something good.</p>
          <button
            className="import-button"
            disabled={!!busy}
            onClick={() => fileInput.current?.click()}
          >
            <Upload size={17} />
            <span>Import media</span>
            <span className="key">＋</span>
          </button>
          <p className="file-hint">
            Videos & images · files stay on your device
          </p>
          <div className="library-label">
            YOUR MEDIA{" "}
            <span>
              {assets.length
                ? "Click + to add to timeline"
                : "READY WHEN YOU ARE"}
            </span>
          </div>
          <div className="asset-list">
            {assets.map((asset) => (
              <div className="asset-card" key={asset.id}>
                <div className="asset-thumb">
                  <img src={asset.thumbnail || asset.url} alt="" />
                  <span>
                    {asset.kind === "video" ? (
                      <Film size={11} />
                    ) : (
                      <ImageIcon size={11} />
                    )}{" "}
                    {formatTime(asset.duration)}
                  </span>
                  <button
                    aria-label={`Add ${asset.name} to timeline`}
                    onClick={() => add(asset)}
                  >
                    <Plus size={17} />
                  </button>
                </div>
                <div className="asset-caption">
                  <span title={asset.name}>{asset.name}</span>
                  <small>
                    {asset.width} × {asset.height}
                  </small>
                </div>
              </div>
            ))}
            {!assets.length && (
              <div className="library-empty">
                <div className="empty-files">
                  <Film size={24} />
                  <ImageIcon size={20} />
                </div>
                <p>
                  Your next story
                  <br />
                  starts here.
                </p>
                <span>
                  Drop a few files in, or explore
                  <br />
                  with our original demo.
                </span>
                <button
                  className="text-button"
                  disabled={!!busy}
                  onClick={demo}
                >
                  Try demo project <ArrowUpRight size={13} />
                </button>
              </div>
            )}
          </div>
          <div className="privacy-note">
            <span className="privacy-symbol">◈</span>
            <div>
              <strong>Your media. Your machine.</strong>
              <p>
                No uploads. No account.
                <br />
                <button
                  className="privacy-link"
                  onClick={() => setPrivacyOpen(true)}
                >
                  How local editing works ↗
                </button>
              </p>
            </div>
          </div>
        </aside>
        <main className="preview-panel">
          <div className="preview-heading">
            <div>
              <span className="eyebrow">
                COMPOSITION · {project.ratio} · 30 FPS
              </span>
              <h1>
                {project.clips.length
                  ? project.name
                  : "A private, browser-native video editor."}
              </h1>
            </div>
            <select
              aria-label="Canvas aspect ratio"
              value={project.ratio}
              onChange={(e) =>
                commit({ ...project, ratio: e.target.value as Ratio })
              }
            >
              <option>16:9</option>
              <option>9:16</option>
              <option>1:1</option>
            </select>
          </div>
          <div className="canvas-stage">
            <div
              className={`canvas-wrap ${!current ? "welcome-canvas" : ""}`}
              style={{
                aspectRatio: project.ratio.replace(":", "/"),
                width: `min(100%, calc(100cqh * ${size.width / size.height}))`,
              }}
            >
              {current ? (
                <canvas
                  ref={canvas}
                  width={size.width}
                  height={size.height}
                  aria-label="Video preview"
                />
              ) : (
                <div className="welcome-art">
                  <div className="art-grid" />
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <div className="art-label">
                    PRIVATE BY DESIGN. LOCAL BY DEFAULT.
                  </div>
                  <div className="welcome-type">
                    Your footage.
                    <br />
                    <em>Your machine.</em>
                  </div>
                  <div className="art-bottom">
                    <span>YOUR MEDIA NEVER LEAVES YOUR MACHINE</span>
                    <span>↗</span>
                  </div>
                  <button
                    className="demo-pill"
                    disabled={!!busy}
                    onClick={demo}
                  >
                    <Play size={13} fill="currentColor" />
                    Try demo project
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="transport">
            <div className="timecode">
              {formatTime(time, true)}
              <span>/ {formatTime(duration, true)}</span>
            </div>
            <div className="play-controls">
              <button
                className="icon-button"
                aria-label="Restart preview"
                disabled={!duration}
                onClick={() => setTime(0)}
              >
                <SkipBack size={17} />
              </button>
              <button
                className="icon-button frame-step"
                aria-label="Previous frame"
                title="Previous frame (←)"
                disabled={!duration || time <= 0}
                onClick={() => {
                  setPlaying(false);
                  setTime((t) => Math.max(0, t - 1 / 30));
                }}
              >
                <ChevronLeft size={17} />
              </button>
              <button
                className="play-button"
                aria-label={playing ? "Pause preview" : "Play preview"}
                disabled={!duration}
                onClick={() => {
                  if (time >= duration) setTime(0);
                  setPlaying((p) => !p);
                }}
              >
                {playing ? (
                  <Pause size={19} fill="currentColor" />
                ) : (
                  <Play size={19} fill="currentColor" />
                )}
              </button>
              <button
                className="icon-button frame-step"
                aria-label="Next frame"
                title="Next frame (→)"
                disabled={!duration || time >= duration}
                onClick={() => {
                  setPlaying(false);
                  setTime((t) => Math.min(duration, t + 1 / 30));
                }}
              >
                <ChevronRight size={17} />
              </button>
              <span className="space-key">SPACE</span>
            </div>
            <span className="preview-quality">
              {size.width} × {size.height}
              <span>
                FRAME {Math.floor(time * 30)} / {Math.ceil(duration * 30)} · 30
                FPS
              </span>
            </span>
          </div>
          <div className="mobile-tabs">
            <button
              className={mobileTab === "media" ? "active" : ""}
              onClick={() => setMobileTab("media")}
            >
              Media library
            </button>
            <button
              className={mobileTab === "inspector" ? "active" : ""}
              onClick={() => setMobileTab("inspector")}
            >
              Clip inspector
            </button>
          </div>
        </main>
        <aside
          className={`inspector panel ${mobileTab === "inspector" ? "mobile-active" : ""}`}
        >
          <div className="panel-heading">
            <h2>Clip inspector</h2>
            <PanelRightClose size={15} />
          </div>
          {selectedClip && selectedAsset ? (
            <>
              <div className="selected-media">
                <img
                  src={selectedAsset.thumbnail || selectedAsset.url}
                  alt=""
                />
                <div>
                  <strong>{selectedAsset.name}</strong>
                  <span>
                    {selectedAsset.kind === "video"
                      ? "VIDEO CLIP"
                      : "STILL IMAGE"}{" "}
                    · {formatTime(clipDuration(selectedClip), true)}
                  </span>
                </div>
              </div>
              <section className="inspector-section">
                <h3>
                  Trim clip <Scissors size={13} />
                </h3>
                <div className="trim-fields">
                  <label>
                    In point
                    <input
                      aria-label="Clip in point seconds"
                      type="number"
                      min="0"
                      max={selectedClip.out - 0.1}
                      step="0.1"
                      value={Number(selectedClip.in.toFixed(2))}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (n >= 0 && n < selectedClip.out - 0.09)
                          updateClip({ in: n });
                      }}
                    />
                  </label>
                  <label>
                    Out point
                    <input
                      aria-label="Clip out point seconds"
                      type="number"
                      min={selectedClip.in + 0.1}
                      max={selectedAsset.duration}
                      step="0.1"
                      value={Number(selectedClip.out.toFixed(2))}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (
                          n > selectedClip.in + 0.09 &&
                          n <= selectedAsset.duration &&
                          duration + n - selectedClip.out <= MAX_DURATION
                        )
                          updateClip({ out: n });
                      }}
                    />
                  </label>
                </div>
                <p className="control-note">Seconds in the original source.</p>
                <label className="field-label">
                  Frame fit
                  <select
                    value={selectedClip.fit}
                    onChange={(e) =>
                      updateClip({ fit: e.target.value as Clip["fit"] })
                    }
                  >
                    <option value="contain">Fit inside frame</option>
                    <option value="cover">Fill frame</option>
                  </select>
                </label>
              </section>
              <section className="inspector-section">
                <h3>
                  Title overlay <span className="small-tag">Aa</span>
                </h3>
                <textarea
                  aria-label="Title overlay text"
                  placeholder="Say something memorable…"
                  rows={3}
                  value={selectedClip.title}
                  onChange={(e) => updateClip({ title: e.target.value })}
                  maxLength={160}
                />
                <div className="field-row">
                  <label className="field-label">
                    Position
                    <select
                      value={selectedClip.titlePosition}
                      onChange={(e) =>
                        updateClip({
                          titlePosition: e.target
                            .value as Clip["titlePosition"],
                        })
                      }
                    >
                      <option value="top">Top</option>
                      <option value="center">Center</option>
                      <option value="bottom">Bottom</option>
                    </select>
                  </label>
                  <label className="field-label color-field">
                    Color
                    <input
                      aria-label="Title color"
                      type="color"
                      value={selectedClip.titleColor}
                      onChange={(e) =>
                        updateClip({ titleColor: e.target.value })
                      }
                    />
                  </label>
                </div>
                <label className="range-label">
                  Text size <span>{selectedClip.titleSize}px</span>
                  <input
                    aria-label="Title text size"
                    type="range"
                    min="20"
                    max="100"
                    value={selectedClip.titleSize}
                    onChange={(e) =>
                      updateClip({ titleSize: Number(e.target.value) })
                    }
                  />
                </label>
              </section>
              {selectedAsset.kind === "video" && (
                <section className="inspector-section">
                  <h3>
                    Audio <Volume2 size={14} />
                  </h3>
                  <label className="range-label">
                    Clip volume
                    <span>{Math.round(selectedClip.volume * 100)}%</span>
                    <input
                      aria-label="Clip volume"
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={selectedClip.volume}
                      onChange={(e) =>
                        updateClip({ volume: Number(e.target.value) })
                      }
                    />
                  </label>
                </section>
              )}
              <button className="remove-button" onClick={remove}>
                <Trash2 size={14} />
                Remove clip
              </button>
            </>
          ) : (
            <div className="inspector-empty">
              <div className="inspector-illustration">
                <span />
                <span />
                <span />
              </div>
              <h3>Fine-tune the details.</h3>
              <p>
                Select a clip in the timeline
                <br />
                to trim, frame, and add a title.
              </p>
              <span className="tiny-caption">
                GOOD STORIES ARE IN THE DETAILS.
              </span>
            </div>
          )}
        </aside>
      </div>
      <section className="timeline">
        <div className="timeline-toolbar">
          <div className="timeline-title">
            <h2>Timeline</h2>
            <span>{project.clips.length} clips</span>
          </div>
          <div className="timeline-tools">
            <button
              className="icon-button"
              aria-label="Undo"
              title="Undo (⌘Z)"
              disabled={!past.length}
              onClick={undo}
            >
              <Undo2 size={16} />
            </button>
            <button
              className="icon-button"
              aria-label="Redo"
              title="Redo (⌘⇧Z)"
              disabled={!future.length}
              onClick={redo}
            >
              <Redo2 size={16} />
            </button>
            <span className="divider" />
            <button
              className="tool-button"
              disabled={!point || time <= 0 || time >= duration}
              onClick={() => commit(splitClip(project, time))}
            >
              <Scissors size={15} />
              Split
            </button>
            <button
              className="icon-button"
              aria-label="Move selected clip left"
              disabled={!selectedClip || project.clips[0]?.id === selected}
              onClick={() => commit(moveClip(project, selected, -1))}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="icon-button"
              aria-label="Move selected clip right"
              disabled={!selectedClip || project.clips.at(-1)?.id === selected}
              onClick={() => commit(moveClip(project, selected, 1))}
            >
              <ChevronRight size={16} />
            </button>
            <button
              className="icon-button"
              aria-label="Delete selected clip"
              disabled={!selected}
              onClick={remove}
            >
              <Trash2 size={15} />
            </button>
          </div>
          <span className="timeline-duration">
            {formatTime(duration)} <span>/ 03:00 max</span>
          </span>
        </div>
        <div className="timeline-body">
          <div className="track-labels">
            <div>TIME</div>
            <div>
              <Film size={14} />
              VIDEO <span>01</span>
            </div>
            <div>
              <span className="type-icon">T</span>TITLES <span>02</span>
            </div>
          </div>
          <div className="tracks">
            <div className="ruler">
              {Array.from({ length: 9 }, (_, i) => (
                <span key={i}>
                  {formatTime((i * (duration > 0 ? duration : 20)) / 8)}
                </span>
              ))}
              <input
                aria-label="Timeline playhead"
                type="range"
                min="0"
                max={Math.max(duration, 0.01)}
                step="0.01"
                value={time}
                onChange={(e) => {
                  setTime(Number(e.target.value));
                  setPlaying(false);
                }}
              />
            </div>
            <div className="clip-track">
              {project.clips.map((clip, i) => {
                const asset = assets.find((a) => a.id === clip.assetId);
                return (
                  <button
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData("text/clip-id", clip.id)
                    }
                    onDragOver={(e) => {
                      if (e.dataTransfer.types.includes("text/clip-id"))
                        e.preventDefault();
                    }}
                    onDrop={(e) => {
                      const id = e.dataTransfer.getData("text/clip-id");
                      if (!id) return;
                      e.preventDefault();
                      e.stopPropagation();
                      const clips = project.clips.filter((c) => c.id !== id),
                        moving = project.clips.find((c) => c.id === id);
                      if (moving) {
                        clips.splice(i, 0, moving);
                        commit({ ...project, clips });
                      }
                    }}
                    key={clip.id}
                    title={`${asset?.name || "Missing media"} · ${formatTime(clipDuration(clip), true)}`}
                    className={`timeline-clip ${selected === clip.id ? "selected" : ""}`}
                    style={{
                      flex: `0 0 ${duration ? (clipDuration(clip) / duration) * 100 : 0}%`,
                      backgroundImage: `linear-gradient(90deg,rgba(12,15,10,.25),rgba(12,15,10,.5)),url("${asset?.thumbnail || ""}")`,
                    }}
                    onClick={() => {
                      setSelected(clip.id);
                      setTime(clipStart(project.clips, clip.id));
                      setMobileTab("inspector");
                    }}
                  >
                    <span className="clip-number">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <strong>{asset?.name || "Missing media"}</strong>
                    <small>{formatTime(clipDuration(clip), true)}</small>
                  </button>
                );
              })}
              {!project.clips.length && (
                <button
                  className="empty-track"
                  onClick={() => fileInput.current?.click()}
                >
                  <Plus size={17} />
                  <span>Add your first clip to start the story</span>
                  <small>IMPORT MEDIA OR TRY THE DEMO</small>
                </button>
              )}
            </div>
            <div className="title-track">
              {project.clips.map((clip) => (
                <button
                  key={clip.id}
                  className={clip.title ? "title-block" : ""}
                  style={{
                    flex: `0 0 ${duration ? (clipDuration(clip) / duration) * 100 : 0}%`,
                  }}
                  onClick={() => {
                    setSelected(clip.id);
                    setMobileTab("inspector");
                  }}
                >
                  {clip.title && (
                    <>
                      <span>T</span>
                      {clip.title}
                    </>
                  )}
                </button>
              ))}
            </div>
            {duration > 0 && (
              <div
                className="playhead"
                style={{ left: `${(time / duration) * 100}%` }}
              >
                <span />
              </div>
            )}
          </div>
        </div>
        <div className="timeline-footer">
          <button
            className="footer-privacy"
            onClick={() => setPrivacyOpen(true)}
          >
            <span className="status-dot" />
            Your media never leaves your machine <span>↗</span>
          </button>
          <span>
            SPACE <em>play / pause</em>
            <span className="footer-separator">/</span>← → <em>one frame</em>
            <span className="footer-separator">/</span>DEL <em>remove clip</em>
          </span>
        </div>
      </section>
      {current?.kind === "video" && (
        <video
          key={current.id}
          ref={video}
          src={current.url}
          preload="auto"
          playsInline
          className="source-media"
          onLoadedData={() => {
            if (video.current && point) {
              video.current.currentTime = point.sourceTime;
              video.current.volume = point.clip.volume;
              if (playing) video.current.play().catch(() => setPlaying(false));
            }
          }}
        />
      )}
      {current?.kind === "image" && (
        <img
          key={current.id}
          ref={image}
          src={current.url}
          alt=""
          className="source-media"
        />
      )}
      {busy && (
        <div className="toast busy-toast" role="status">
          <LoaderCircle size={16} className="spin" />
          {busy}
        </div>
      )}
      {notice && !busy && (
        <div className="toast" role="status">
          <Check size={15} />
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {dragging && (
        <div className="drop-overlay">
          <Upload size={40} />
          <h2>Drop it like a good idea.</h2>
          <p>Your videos and images stay on this device.</p>
        </div>
      )}
      {relinkOpen && pending.current && (
        <div className="modal-backdrop">
          <section
            className="export-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="relink-title"
            onKeyDown={(e) => {
              if (e.key === "Escape" && !busy) {
                clearPending();
                setRelinkOpen(false);
                setError("");
              }
            }}
          >
            <div className="modal-top">
              <span className="eyebrow">RECONNECT YOUR MEDIA</span>
              <button
                className="icon-button"
                aria-label="Cancel opening project"
                disabled={!!busy}
                onClick={() => {
                  clearPending();
                  setRelinkOpen(false);
                  setError("");
                }}
              >
                <X size={19} />
              </button>
            </div>
            <h2 id="relink-title">
              Bring your
              <br />
              <em>originals along.</em>
            </h2>
            <p className="export-description">
              This project saves your edit decisions. Choose the original files
              below to restore it. Your current project stays open until
              everything matches.
            </p>
            <ul
              style={{
                fontSize: 11,
                color: "#bfd5a7",
                lineHeight: 1.9,
                paddingLeft: 18,
                overflowWrap: "anywhere",
              }}
            >
              {pending.current.media
                .filter((ref) => !ref.demo)
                .map((ref) => (
                  <li key={ref.id}>{ref.name}</li>
                ))}
            </ul>
            <button
              autoFocus
              className="button primary export-start"
              disabled={!!busy}
              onClick={() => relinkInput.current?.click()}
            >
              <FolderOpen size={16} />
              Choose original files
            </button>
            <button
              className="button secondary export-start"
              style={{ marginTop: 10 }}
              disabled={!!busy}
              onClick={() => {
                clearPending();
                setRelinkOpen(false);
                setError("");
              }}
            >
              Cancel opening
            </button>
            <p className="export-privacy">
              Select all listed originals together. Files stay on your machine.
            </p>
          </section>
        </div>
      )}
      {privacyOpen && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPrivacyOpen(false);
          }}
        >
          <section
            className="export-modal privacy-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-title"
            onKeyDown={(e) => {
              if (e.key === "Escape") setPrivacyOpen(false);
            }}
          >
            <div className="modal-top">
              <span className="eyebrow">PRIVATE BY DESIGN</span>
              <button
                autoFocus
                className="icon-button"
                aria-label="Close privacy explanation"
                onClick={() => setPrivacyOpen(false)}
              >
                <X size={19} />
              </button>
            </div>
            <h2 id="privacy-title">
              Your footage.
              <br />
              <em>Your machine.</em>
            </h2>
            <p className="privacy-intro">
              A private, browser-native video editor. Your media never leaves
              your machine.
            </p>
            <dl className="privacy-details">
              <dt>No uploads or server rendering.</dt>
              <dd>
                Your browser reads the files you choose, previews your
                composition, and renders the finished video on your device.
              </dd>
              <dt>No accounts. No analytics.</dt>
              <dd>
                Start editing without signing in. Cutroom does not send your
                footage or track your editing activity.
              </dd>
              <dt>You keep the originals.</dt>
              <dd>
                Editing does not change your source files. A saved project
                contains edit decisions and media references, not your footage.
                Keep your originals and select them again when reopening.
                Original demo media is recreated automatically.
              </dd>
            </dl>
            <button
              className="button primary export-start"
              onClick={() => setPrivacyOpen(false)}
            >
              Back to your story <ArrowUpRight size={15} />
            </button>
          </section>
        </div>
      )}
      {exportOpen && (
        <div className="modal-backdrop">
          <section
            className="export-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-title"
          >
            <div className="modal-top">
              <span className="eyebrow">READY FOR THE WORLD</span>
              <button
                className="icon-button"
                aria-label="Close export dialog"
                disabled={progress !== null}
                onClick={() => setExportOpen(false)}
              >
                <X size={19} />
              </button>
            </div>
            <h2 id="export-title">
              One last cut.
              <br />
              <em>Then it’s yours.</em>
            </h2>
            <p className="export-description">
              Render your timeline into a video, right here in your browser.
            </p>
            <div className="export-summary">
              <span>{project.clips.length} clips</span>
              <span>{formatTime(duration)}</span>
              <span>
                {size.width} × {size.height}
              </span>
            </div>
            <label className="field-label">
              Video format
              <select
                disabled={progress !== null}
                value={format}
                onChange={(e) => {
                  setFormat(e.target.value as "webm" | "mp4");
                  setResult(null);
                }}
              >
                <option value="webm" disabled={!capabilities.webm}>
                  WebM · browser video
                </option>
                <option value="mp4" disabled={!capabilities.mp4}>
                  MP4{!capabilities.mp4 ? " · unavailable in this browser" : ""}
                </option>
              </select>
            </label>
            <p className="control-note">
              Keep this tab open while your video renders. Export speed depends
              on your browser and clips.
            </p>
            {progress !== null ? (
              <div className="export-progress">
                <div>
                  <span>Rendering your story…</span>
                  <strong>
                    {Math.round(progress > 1 ? progress : progress * 100)}%
                  </strong>
                </div>
                <progress
                  max="100"
                  value={progress > 1 ? progress : progress * 100}
                />
                <button
                  className="button secondary"
                  onClick={() => abort.current?.abort()}
                >
                  Cancel export
                </button>
              </div>
            ) : result ? (
              <div className="export-complete">
                <span>
                  <Check size={18} />
                  Your video is ready.
                </span>
                <video
                  className="export-result-player"
                  src={resultUrl}
                  controls
                  playsInline
                  aria-label="Exported video preview"
                />
                <a
                  className="button primary"
                  href={resultUrl}
                  download={result.filename}
                >
                  <Download size={16} />
                  Download video
                </a>
              </div>
            ) : (
              <button
                className="button primary export-start"
                onClick={startExport}
                disabled={!capabilities[format]}
              >
                <Download size={16} />
                Export {format.toUpperCase()}
                <ArrowUpRight size={15} />
              </button>
            )}
            <p className="export-privacy">
              Local by design. Your footage never leaves your device.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
