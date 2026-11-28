import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useStore } from 'zustand';
import {
  ACCESSORIES,
  AGENT_COLORS,
  agentColorHex,
  HAIR_COLORS,
  HAIR_STYLES,
  marketingTeam,
  SKIN_TONES,
  ZERO_INVENTION_RULE,
  type AgentDraft,
  type AgentDraftErrors,
  type AgentProfile,
  type Appearance,
} from '@ai-hq/domain';
import { CharacterSvg } from '../render/character/svg';
import { toCss } from '../render/palette';
import { officeStore, type OfficeStore } from '../state/store';

function draftOf(profile: AgentProfile): AgentDraft {
  return {
    name: profile.name,
    role: profile.role,
    color: profile.color,
    appearance: profile.appearance,
    systemPrompt: profile.systemPrompt,
  };
}

const APPEARANCE_FIELDS: readonly {
  key: keyof Appearance;
  label: string;
  options: readonly { id: string; name: string }[];
}[] = [
  { key: 'skinTone', label: 'Tono de piel', options: SKIN_TONES },
  { key: 'hairStyle', label: 'Peinado', options: HAIR_STYLES },
  { key: 'hairColor', label: 'Color de pelo', options: HAIR_COLORS },
  { key: 'accessory', label: 'Accesorio', options: ACCESSORIES },
];

const INPUT =
  'mt-1 w-full rounded-md border border-slate-600 bg-slate-800 px-2 py-1.5 text-sm text-slate-100 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none aria-[invalid=true]:border-rose-400';
const BUTTON =
  'rounded-md border border-slate-600 px-3 py-1.5 text-sm font-medium hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none';

/** Editor dialog of the open agent (FR-030–FR-032); renders nothing while closed. */
export function AgentEditor({ store = officeStore }: { store?: OfficeStore }) {
  const agentId = useStore(store, (state) => state.editor?.agentId ?? null);
  const profile = useStore(store, (state) => state.team.find((a) => a.id === agentId) ?? null);
  if (!profile) return null;
  // Keyed by agent so the form state starts from the saved values on every open.
  return <EditorDialog key={profile.id} store={store} profile={profile} />;
}

function EditorDialog({ store, profile }: { store: OfficeStore; profile: AgentProfile }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const team = useStore(store, (state) => state.team);
  const [draft, setDraft] = useState<AgentDraft>(() => draftOf(profile));
  const [errors, setErrors] = useState<AgentDraftErrors>({});

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  const close = () => store.getState().closeEditor();
  const save = () => setErrors(store.getState().saveAgent(profile.id, draft));
  const restore = () => {
    const seed = marketingTeam.find((a) => a.id === profile.id);
    if (seed) setDraft(draftOf(seed));
    setErrors({});
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  };
  const field = (name: keyof AgentDraftErrors) => ({
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `${id}-${name}` : undefined,
  });
  const errorText = (name: keyof AgentDraftErrors) =>
    errors[name] ? (
      <p id={`${id}-${name}`} className="mt-1 text-xs text-rose-300">
        {errors[name]}
      </p>
    ) : null;
  const usedBy = (color: string) => team.find((a) => a.id !== profile.id && a.color === color);

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      data-ui-control
      onKeyDown={onKeyDown}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      className="m-auto max-h-[90vh] w-[40rem] overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-5 text-slate-100 shadow-2xl backdrop:bg-black/60"
    >
      <form
        method="dialog"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <h2 id={`${id}-title`} className="text-base font-semibold">
          Editar agente: {profile.name}
        </h2>
        <div className="mt-4 flex gap-5">
          <div className="flex w-28 shrink-0 flex-col items-center gap-2">
            <CharacterSvg
              appearance={draft.appearance}
              color={agentColorHex(draft.color)}
              label={`Vista previa de ${profile.name}`}
              size={110}
            />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="text-sm">
              <label htmlFor={`${id}-name-input`}>Nombre</label>
              <input
                id={`${id}-name-input`}
                className={INPUT}
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                {...field('name')}
              />
              {errorText('name')}
            </div>
            <div className="text-sm">
              <label htmlFor={`${id}-role-input`}>Rol</label>
              <input
                id={`${id}-role-input`}
                className={INPUT}
                value={draft.role}
                onChange={(e) => setDraft({ ...draft, role: e.target.value })}
                {...field('role')}
              />
              {errorText('role')}
            </div>
            <fieldset>
              <legend className="text-sm">Color</legend>
              <div
                role="radiogroup"
                aria-label="Color"
                {...field('color')}
                className="mt-1 flex flex-wrap gap-2"
              >
                {AGENT_COLORS.map((c) => {
                  const owner = usedBy(c.id);
                  return (
                    <label
                      key={c.id}
                      className="flex items-center gap-1 text-xs"
                      title={owner ? `Lo usa ${owner.name}` : c.name}
                    >
                      <input
                        type="radio"
                        name={`${id}-color`}
                        value={c.id}
                        checked={draft.color === c.id}
                        onChange={() => setDraft({ ...draft, color: c.id })}
                      />
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: toCss(c.hex) }}
                      />
                      {c.name}
                      {owner ? ` (${owner.name})` : ''}
                    </label>
                  );
                })}
              </div>
              {errorText('color')}
            </fieldset>
            <div className="grid grid-cols-2 gap-3">
              {APPEARANCE_FIELDS.map(({ key, label, options }) => (
                <div key={key} className="text-sm">
                  <label htmlFor={`${id}-${key}-input`}>{label}</label>
                  <select
                    id={`${id}-${key}-input`}
                    className={INPUT}
                    value={draft.appearance[key]}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        appearance: { ...draft.appearance, [key]: e.target.value },
                      })
                    }
                    {...field(`appearance.${key}`)}
                  >
                    {options.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                  {errorText(`appearance.${key}`)}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div
          role="note"
          aria-label="Regla de cero invenciones"
          className="mt-4 rounded-md border border-amber-500/40 bg-amber-950/40 p-2 text-xs text-amber-100"
        >
          <strong className="block">Regla de cero invenciones (fija, siempre incluida)</strong>
          {ZERO_INVENTION_RULE}
        </div>
        <div className="mt-3 text-sm">
          <label htmlFor={`${id}-prompt-input`}>System prompt</label>
          <textarea
            id={`${id}-prompt-input`}
            className={`${INPUT} h-40 resize-y`}
            value={draft.systemPrompt}
            onChange={(e) => setDraft({ ...draft, systemPrompt: e.target.value })}
            {...field('systemPrompt')}
          />
          <span className="text-xs text-slate-400">{draft.systemPrompt.trim().length} / 4000</span>
          {errorText('systemPrompt')}
        </div>
        <div className="mt-4 flex justify-between gap-2">
          <button type="button" className={BUTTON} onClick={restore}>
            Restaurar valores originales
          </button>
          <div className="flex gap-2">
            <button type="button" className={BUTTON} onClick={close}>
              Cancelar
            </button>
            <button
              type="submit"
              className={`${BUTTON} border-sky-500 bg-sky-700 hover:bg-sky-600`}
            >
              Guardar
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
