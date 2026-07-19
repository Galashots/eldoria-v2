from pathlib import Path

path = Path('tests/vertical-slice.spec.ts')
text = path.read_text(encoding='utf-8')
old = """  const start = (await state(page)).player;
  await moveGrade2Hero(page, 'KeyD', 'right');
  expect((await state(page)).player.x).toBeGreaterThan(start.x);
  await moveGrade2Hero(page, 'KeyA', 'left');
  expect((await state(page)).player.x).toBeLessThan(start.x + 20);
  await moveGrade2Hero(page, 'KeyS', 'front');
  expect((await state(page)).player.y).toBeGreaterThan(start.y);
  await moveGrade2Hero(page, 'KeyW', 'back');
  // Canvas and WebGL can land one frame apart under CI. Keep the round-trip
  // check within one 32px map tile while still proving the second move
  // substantially reverses the first.
  expect((await state(page)).player.y).toBeLessThan(start.y + 32);

  await moveGrade2Hero(page, 'KeyS', 'front', 700);
  expect((await state(page)).player.y).toBeGreaterThan(320);
  await moveGrade2Hero(page, 'KeyW', 'back', 700);
  expect((await state(page)).player.y).toBeLessThan(start.y + 20);
"""
new = """  const start = (await state(page)).player;
  // Fixed-duration key holds can land one renderer frame apart. Keep each
  // round trip within one 32px map tile while still proving the reverse move
  // substantially cancels the forward move under both Canvas and WebGL.
  const movementReturnTolerance = 32;
  await moveGrade2Hero(page, 'KeyD', 'right');
  expect((await state(page)).player.x).toBeGreaterThan(start.x);
  await moveGrade2Hero(page, 'KeyA', 'left');
  expect((await state(page)).player.x).toBeLessThan(start.x + movementReturnTolerance);
  await moveGrade2Hero(page, 'KeyS', 'front');
  expect((await state(page)).player.y).toBeGreaterThan(start.y);
  await moveGrade2Hero(page, 'KeyW', 'back');
  expect((await state(page)).player.y).toBeLessThan(start.y + movementReturnTolerance);

  await moveGrade2Hero(page, 'KeyS', 'front', 700);
  expect((await state(page)).player.y).toBeGreaterThan(320);
  await moveGrade2Hero(page, 'KeyW', 'back', 700);
  expect((await state(page)).player.y).toBeLessThan(start.y + movementReturnTolerance);
"""
if new in text:
    print('Renderer-agnostic movement tolerance already applied.')
elif text.count(old) == 1:
    path.write_text(text.replace(old, new, 1), encoding='utf-8')
    print('Applied renderer-agnostic movement tolerance.')
else:
    raise SystemExit(f'Expected one movement block; found {text.count(old)}')
