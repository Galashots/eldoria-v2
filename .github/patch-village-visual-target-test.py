from pathlib import Path

path = Path('scripts/test-visual-targets.mjs')
text = path.read_text(encoding='utf-8')
old = """    ['ruins', 'ui_neutral'],
    'scoped farm families without swatches must be reported as deferred rather than falsely resolved'
"""
new = """    ['ui_neutral'],
    'remaining scoped farm families without swatches must be reported as deferred rather than falsely resolved'
"""
if new in text:
    print('Village palette-resolution expectation already current.')
elif text.count(old) == 1:
    path.write_text(text.replace(old, new, 1), encoding='utf-8')
    print('Updated deferred-family expectation after resolving village stone art.')
else:
    raise SystemExit(f'Expected one deferred-family assertion; found {text.count(old)}')
