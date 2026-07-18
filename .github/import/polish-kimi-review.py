from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file_path = Path(path)
    text = file_path.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, found {count}: {old!r}')
    file_path.write_text(text.replace(old, new, 1), encoding='utf-8')

replace_once(
    'docs/CHATGPT_CHANGELOG.md',
    'CI now runs PWA validation, regenerates PWA icons and the terrain-proof map/sheet and requires a clean diff, retains unit-test diagnostics on failure, and runs the full browser smoke suite.',
    'The repository check now runs PWA validation, regenerates PWA icons and the terrain-proof map/sheet and requires a clean diff; the existing CI then runs unit tests and the full browser smoke suite.'
)

replace_once(
    'tests/vertical-slice.spec.ts',
    '/** True once any canvas text containing `text` has been seen since boot (see the recorder in boot()). For transient floating toasts. */',
    '/** True once canvas text containing `text` has been seen since the recorder was last reset. For transient floating toasts. */'
)

replace_once(
    'tests/vertical-slice.spec.ts',
    "          off: (event: string) => void;",
    "          off: (event: string, cb: (anim: { key: string }) => void) => void;"
)

print('Applied final Kimi review polish.')
