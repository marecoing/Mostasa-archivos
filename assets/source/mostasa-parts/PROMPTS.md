# Prompts de producción

Modo: ImageGen integrado. Cada pieza se generó por separado sobre croma verde
y se convirtió después a RGBA. Las referencias indicadas se usaron sólo para
mantener identidad, paleta y grosor de línea.

## `cabeza-source.png`

```text
Use case: stylized-concept
Asset type: modular 2.5D beat-'em-up character part — cabeza.png
Primary request: Draw ONLY the isolated head of Mostasa, an adult Argentine male hero, in three-quarter profile facing screen-right. Include swept-back dark hair with a mature receding hairline, one visible ear, strong eyebrow, one readable eye, prominent nose, square jaw, and a distinctive thick dark moustache. No neck, shoulders, torso, clothing, shadow, text, frame, or extra objects.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for local removal; absolutely uniform edge-to-edge.
Style/medium: polished flat vector game illustration; strong readable silhouette; uniform closed dark ink contour; graphic action-animation look in the visual family specified by the project's art brief; no gradients, no blur, no painterly texture, no photorealism.
Composition/framing: single isolated head centered with generous even padding; full silhouette visible and never cropped; face points right; upright orientation.
Lighting/mood: single key light from upper-left of the canvas; lit planes on the left, shadow planes on the right; stern determined expression.
Color palette: use only #11141d, #1d2231, #c98d63, #e0a97d, #8f6044 and the chroma background #00ff00. Dark hair and moustache #11141d; skin base #c98d63; lit skin #e0a97d; skin shadow #8f6044.
Constraints: one piece only; bold uniform closed ink outline; flat color regions only; anatomically coherent; no neck; no cast/contact shadow; no reflections; no highlights outside the listed palette; no transparent checkerboard; no watermark; no text. The green background must contain no shadow, gradients, texture, floor plane, lighting variation, or objects. Do not use #00ff00 anywhere inside the head.
```

## `torso-source.png`

Referencia: `cabeza-source.png`, sólo para identidad, línea y paleta.

```text
Use case: stylized-concept
Asset type: modular 2.5D beat-'em-up character part — torso.png
Input images: Image 1 is a style, character-identity, line-weight, and palette reference only; do not include or copy the head itself.
Primary request: Draw ONLY Mostasa's isolated torso: mustard work jacket from pelvis/hip line through shoulders, with a small skin neck emerging from the collar. Adult Argentine male, sturdy but believable proportions. Jacket is slightly narrower than the shoulder line so separate arms remain visible. Include front opening/lapel and a compact waistband/hem. No head, hair, arms, hands, legs, pants, shadow, text, frame, or extra objects.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for local removal; absolutely uniform edge-to-edge.
Style/medium: match Image 1 exactly: polished flat vector game illustration, strong silhouette, uniform closed #11141d ink contour, flat graphic action-animation style; no gradients, blur, texture, or photorealism.
Composition/framing: one isolated torso centered with generous padding; complete silhouette never cropped; neutral three-quarter body orientation facing screen-right; normal upright anatomy with neck above and pelvis/hem below for source production.
Lighting/mood: one key light from upper-left; lit planes on the left, shadow planes on the right.
Color palette: only #11141d, #1d2231, #d9a21b, #f0c247, #8f6510, #c98d63, #e0a97d, #8f6044, #4d5460 and #00ff00 background. Jacket base #d9a21b, light #f0c247, shadow #8f6510.
Constraints: exactly one torso piece; closed bold uniform ink contour; flat color regions only; no buttons or tiny details that will vanish at game scale; no cast/contact shadow; no watermark; no text. Background perfectly uniform, no floor plane or lighting variation. Never use #00ff00 inside the piece.
```

Corrección aplicada sobre esa generación:

```text
Use case: precise-object-edit
Asset type: modular 2.5D beat-'em-up character part — torso.png source correction
Input images: Image 1 is the edit target.
Primary request: Remove BOTH complete attached sleeves and arms from Image 1. End the jacket body cleanly at the shoulder/armhole seams so the result is ONLY the central torso with collar, lapels, zipper/front opening, waistband/hem, dark undershirt, and short visible neck. The silhouette must have two clean concave armholes; no upper arms, elbows, forearms, hands, sleeve stubs, or dangling fabric.
Constraints: change only the attached sleeves/arms and reconstruct clean armhole edges; keep the central torso design, flat-vector style, proportions, mustard palette, neck, lighting, line weight, framing, and uniform #00ff00 background unchanged. One isolated torso piece only; no head, arms, hands, legs, shadow, text, watermark, gradients, blur, texture, or extra objects. Keep generous padding and do not crop.
```

## `brazo-source.png`

Referencia: `torso-source.png`, sólo para material y estilo.

```text
Use case: stylized-concept
Asset type: modular 2.5D beat-'em-up character part — brazo.png (upper arm only)
Input images: Image 1 is a jacket style, palette, line-weight, and material reference only. Do not include the torso.
Primary request: Draw ONLY one isolated adult male upper arm segment from shoulder to elbow, covered by the same mustard jacket sleeve as Image 1. The shoulder joint is at the top; the bone runs straight vertically downward; the elbow is at the bottom. Strong deltoid bulge near the top, natural taper toward the elbow. No torso, neck, head, forearm, cuff, hand, exposed skin, lower body, shadow, text, or extra objects.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background, uniform edge-to-edge.
Style/medium: match Image 1 exactly; polished flat vector game illustration, bold closed uniform #11141d ink contour, flat graphic shapes, no gradients, blur, texture, or photorealism.
Composition/framing: one centered vertical limb piece with generous even padding; complete silhouette fully visible and not cropped; anatomically neutral straight orientation; shoulder centered above elbow.
Lighting/mood: one key light from upper-left; left plane lit, right plane shadow.
Color palette: only #11141d, #1d2231, #d9a21b, #f0c247, #8f6510, and #00ff00 background. Sleeve base #d9a21b, left highlight #f0c247, right shadow #8f6510.
Constraints: exactly one upper-arm sleeve segment; no sleeve cuff or hand; closed bold silhouette; flat regions only; no cast/contact shadow; no watermark; no text; green background absolutely uniform with no floor plane or lighting variation; never use #00ff00 inside the piece.
```

## `antebrazo-source.png`

Referencia: `brazo-source.png`, sólo para material y estilo.

```text
Use case: stylized-concept
Asset type: modular 2.5D beat-'em-up character part — antebrazo.png (forearm sleeve only)
Input images: Image 1 is a sleeve style, palette, lighting, and line-weight reference only; do not include the upper arm.
Primary request: Draw ONLY one isolated adult male forearm segment from elbow to wrist, covered by the same mustard jacket sleeve. Elbow joint at the top; bone runs straight vertically downward; wrist at the bottom. Subtle upper forearm muscle volume, tapering to a narrow wrist. Include a distinct compact folded sleeve cuff at the wrist. No upper arm, shoulder, hand, fingers, exposed skin, torso, lower body, shadow, text, or extra objects.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background, uniform edge-to-edge.
Style/medium: match Image 1 exactly; polished flat vector game illustration, bold closed uniform #11141d contour, flat graphic regions, no gradients, blur, texture, or photorealism.
Composition/framing: one centered vertical forearm piece with generous even padding; complete silhouette visible and never cropped; elbow centered above wrist.
Lighting/mood: one key light from upper-left; left plane lit, right plane shadow.
Color palette: only #11141d, #1d2231, #d9a21b, #f0c247, #8f6510, and #00ff00 background. Sleeve base #d9a21b; left highlight #f0c247; right shadow and cuff detail #8f6510.
Constraints: exactly one forearm sleeve segment with cuff; no hand or skin; closed bold silhouette; flat color regions only; no cast/contact shadow; no watermark; no text; background perfectly uniform with no floor plane or variation; never use #00ff00 inside the piece.
```

## `mano-source.png`

Referencias: `cabeza-source.png` para piel e identidad;
`antebrazo-source.png` para línea y escala de muñeca.

```text
Use case: stylized-concept
Asset type: modular 2.5D beat-'em-up character part — mano.png
Input images: Image 1 is the skin, character, and flat-vector style reference; Image 2 is line-weight and wrist-scale reference only. Do not include head, sleeve, or forearm.
Primary request: Draw ONLY one isolated adult male hand tightly closed into a fighting fist. Wrist joint at the top; hand axis runs vertically downward. Thumb crosses clearly in front of the curled fingers; knuckle plane is readable with two or three broad graphic separations, not tiny fingernail detail. No forearm, sleeve, cuff, arm, head, torso, shadow, text, or extra objects.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background, uniform edge-to-edge.
Style/medium: match references exactly; polished flat vector game illustration, strong compact silhouette, bold closed uniform #11141d ink contour, flat graphic regions; no gradients, blur, texture, or photorealism.
Composition/framing: one centered compact fist with generous even padding; full silhouette visible and never cropped; wrist centered at top.
Lighting/mood: one key light from upper-left; left plane lit, right plane shadow.
Color palette: only #11141d, #1d2231, #c98d63, #e0a97d, #8f6044 and #00ff00 background. Skin base #c98d63; left highlight #e0a97d; right and crease shadow #8f6044.
Constraints: exactly one fist piece; thumb crossed in front; no wristband or clothing; closed bold silhouette; flat regions only; no cast/contact shadow; no watermark; no text; background perfectly uniform with no floor plane or variation; never use #00ff00 inside the fist.
```

## `muslo-source.png`

Referencia: `brazo-source.png`, sólo para estilo y línea.

```text
Use case: stylized-concept
Asset type: modular 2.5D beat-'em-up character part — muslo.png
Input images: Image 1 is a flat-vector style, silhouette treatment, lighting, and line-weight reference only; do not reuse its mustard color or include an arm.
Primary request: Draw ONLY one isolated adult male thigh segment from hip to knee, covered in practical dark blue work trousers. Hip joint at the top; bone runs straight vertically downward; knee at the bottom. Strong believable thigh volume near the hip, tapering toward a clearly articulated knee; subtle broad fabric fold planes only. No pelvis, belt, torso, other leg, calf, shin, foot, boot, exposed skin, shadow, text, or extra objects.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background, uniform edge-to-edge.
Style/medium: match Image 1 exactly; polished flat vector game illustration, bold closed uniform #11141d ink contour, flat graphic regions, no gradients, blur, texture, or photorealism.
Composition/framing: one centered vertical thigh piece with generous even padding; complete silhouette visible and not cropped; hip centered above knee.
Lighting/mood: one key light from upper-left; left plane lit, right plane shadow.
Color palette: only #11141d, #1d2231, #3a4a6b, #52658a and #00ff00 background. Trousers base #3a4a6b; left highlight #52658a; right shadow #1d2231.
Constraints: exactly one thigh trouser segment; no belt or lower leg; closed bold silhouette; flat color regions only; no cast/contact shadow; no watermark; no text; background perfectly uniform with no floor plane or variation; never use #00ff00 inside the piece.
```

## `pantorrilla-source.png`

Referencia: `muslo-source.png`, sólo para material y estilo.

```text
Use case: stylized-concept
Asset type: modular 2.5D beat-'em-up character part — pantorrilla.png
Input images: Image 1 is the trouser material, palette, flat-vector style, lighting, and line-weight reference only; do not include the thigh.
Primary request: Draw ONLY one isolated adult male lower-leg segment from knee to ankle, covered in the same dark blue work trousers. Knee joint at the top; bone runs straight vertically downward; narrow ankle at the bottom. Because the character faces screen-right, the calf muscle bulge must be visibly on the BACK/LEFT side of the drawing; front/right shin edge straighter. Use a few broad readable fabric planes. No thigh, hip, other leg, foot, boot, sock, exposed skin, shadow, text, or extra objects.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background, uniform edge-to-edge.
Style/medium: match Image 1 exactly; polished flat vector game illustration, bold closed uniform #11141d ink contour, flat graphic regions, no gradients, blur, texture, or photorealism.
Composition/framing: one centered vertical calf piece with generous even padding; full silhouette visible and not cropped; knee centered above ankle.
Lighting/mood: one key light from upper-left; left plane lit, right plane shadow.
Color palette: only #11141d, #1d2231, #3a4a6b, #52658a and #00ff00 background. Trousers base #3a4a6b; left highlight #52658a; right shadow #1d2231.
Constraints: exactly one lower-leg trouser segment; calf bulge on left; no shoe or thigh; closed bold silhouette; flat regions only; no cast/contact shadow; no watermark; no text; background perfectly uniform with no floor plane or variation; never use #00ff00 inside the piece.
```

## `borcegui-source.png`

Referencia: `pantorrilla-source.png`, sólo para estilo y línea.

```text
Use case: stylized-concept
Asset type: modular 2.5D beat-'em-up character part — borcegui.png
Input images: Image 1 is a flat-vector style, lighting, and line-weight reference only; do not include the trouser leg.
Primary request: Draw ONLY one isolated rugged ankle-high combat/work boot (borceguí) for Mostasa. Side three-quarter view facing screen-right, toe clearly pointing right, heel at left. Include a compact ankle shaft, broad reinforced toe, two or three simple lace/eyelet planes, and a clearly separate darker thick outsole. The ankle joint is inside the upper shaft, visibly above the sole; the sole is the lowest horizontal grounding edge. No leg, trousers, sock, body, second shoe, shadow, text, or extra objects.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background, uniform edge-to-edge.
Style/medium: match Image 1 exactly; polished flat vector game illustration, strong readable silhouette, bold closed uniform #11141d ink contour, flat graphic regions, no gradients, blur, texture, or photorealism.
Composition/framing: one boot centered with generous even padding; complete silhouette visible and never cropped; side view reads instantly at small game scale.
Lighting/mood: one key light from upper-left; upper-left planes lit, right/lower planes shadow.
Color palette: only #11141d, #1d2231, #2b3242, #3d4659, #4d5460 and #00ff00 background. Boot base #1d2231 or #2b3242; limited upper-left highlight #3d4659/#4d5460; sole and deepest shadow #11141d.
Constraints: exactly one boot; toe right; outsole darker than upper; no cast/contact shadow beneath it; closed bold silhouette; flat regions only; no watermark; no text; background perfectly uniform with no floor plane or variation; never use #00ff00 inside the boot.
```
