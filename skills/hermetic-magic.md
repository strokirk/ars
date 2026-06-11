# Skill: Hermetic Magic (Ars Magica, Definitive Edition)

A self-contained reference for adjudicating Hermetic spellcasting. Source: Ars Magica DE, Chapters 7 & 9. When a rule is ambiguous, the troupe (storyguide) decides; the system gives sensible levels in the vast majority of cases but common sense overrides it.

---

## 1. The Arts: Technique + Form

Every spell combines one **Technique** (a verb — what magic does) and one **Form** (a noun — what it acts on). A magus has a numeric score in each (0 or higher; all magi have at least 0 in every Art).

**5 Techniques:**
- **Creo (Cr)** "I create" — make things, make them better/healthier examples of their kind, bring into existence. *Cannot* create permanently without vis (Limit of Creation); created things last only for the Duration unless a Momentary Ritual.
- **Intellego (In)** "I perceive" — gather true information directly from a thing's form; not fooled by mundane disguise. Nearly useless vs. the Infernal (reveals only what demons want).
- **Muto (Mu)** "I transform" — grant/remove unnatural properties (give wings, turn to stone). Always must be maintained; reverts when the spell ends (Limit of Essential Nature). Cannot directly injure or kill.
- **Perdo (Pe)** "I destroy" — make things worse examples, destroy wholly or in part. Can only destroy a *whole* natural property (partial = needs Muto requisite).
- **Rego (Re)** "I control" — move/control things into states they could naturally have (move objects, put to sleep, ward, craft). Effects persist after the spell ends. Cannot destroy (that's Perdo).

**10 Forms:** Animal (An, beasts — *not* people), Aquam (Aq, water/liquids), Auram (Au, air/weather/gas), Corpus (Co, human bodies inc. dead/human-looking), Herbam (He, plants & dead plant matter inc. wood/cloth), Ignem (Ig, fire/heat/light), Imaginem (Im, sensory species/appearances — sights, sounds, smells), Mentem (Me, minds/thoughts/spirits/ghosts), Terram (Te, earth/stone/solids/metal), Vim (Vi, raw magic; affects magical/faerie/divine/infernal things).

**Naming:** "Creo Ignem" = create fire/light/heat. "Muto Corpus" = transform a body. Technique always first.

**Requisites:** A spell may need a third (or more) Art. Two kinds: (a) *necessary* for the effect = +0 levels (e.g. turning a man into a bird needs Animal); (b) *enhances* the effect = +1 magnitude or more. When casting with a requisite, your effective primary score is reduced to the **lower** of (primary Art, requisite Art) — and Magic Resistance is still based only on the **primary Form**, not the requisite.

**Form Bonus (defensive):** Form score ÷ 5 (round up) adds to soak/resistance vs. mundane hazards of that Form (e.g. Ignem vs. fire & cold, Corpus vs. disease). Bonuses don't stack — use the highest.

---

## 2. The Die System

- **Simple die:** roll 1d10; 0 counts as 10. Used when calm/unpressured. Cannot botch.
- **Stress die:** roll 1d10. **On a 1, reroll and double** (repeats: 1→1→ quadruple, etc.; on rerolls 0 = 10). **On a 0**, you score 0 and must check for a **botch**: roll the situation's botch dice; if *any* show 0, you botch. ⚠️ Note the asymmetry: on a *stress* die an initial 0 = zero (not ten), but on a *simple* die a 0 = ten.
- **Botch:** total becomes 0 (negating all modifiers) plus something bad happens. Severity scales with how many botch dice came up 0. For spells, the spell usually still goes off but wildly out of control, and the magus gains **1 Warping Point per 0** rolled (2+ from one botch ⇒ check for Wizard's Twilight).
- Botch chance can never exceed 10% (you must roll the 0 first). If botch dice are reduced to 0, the stress roll can't botch.

---

## 3. Casting a Spell

**Casting Score = Technique + Form + Stamina − Encumbrance + Aura Modifier**
(Use the lower of primary/requisite scores where a requisite applies. If two Arts are both relevant to *resistance*, the defender uses the most applicable Form; Vim is the safe default.)

The **Casting Total** is then computed by spell type:

| Type | Casting Total | Notes |
|---|---|---|
| **Formulaic** (a known spell) | Casting Score + die | Simple die if calm, stress die if stressed (or if mastered). Takes seconds. |
| **Ritual** (level ≥ 20, or required by guideline) | Casting Score + Artes Liberales + Philosophiae + **stress die** | Takes 15 min/magnitude; costs **1 pawn vis/magnitude** (vis must match Technique or Form). |
| **Spontaneous, fatiguing** | (Casting Score + **stress die**) ÷ 2 | Always stressful (can botch). Lose 1 Fatigue level. Made up on the spot. |
| **Spontaneous, non-fatiguing** | Casting Score ÷ 5 | No fatigue, no roll. |

**Magnitude** = level ÷ 5 (round up).

**Fatigue track** (six levels, most actions cost these): **Fresh → Winded → Weary (−1) → Tired (−3) → Dazed (−5) → Unconscious.** The penalty (to all rolls except Soak) is that of your least-tired *remaining* level; it stacks with Wound penalties. **Short-term** fatigue (Formulaic/Spontaneous casting, combat) recovers with brief rest (Winded 2 min, Weary 10 min, etc.). **Long-term** fatigue (Ritual casting) needs a full night's sleep per level. Losing more levels than you have ⇒ you fall Unconscious and (for Rituals) take Wounds — see the Ritual table.

**Resolution — Formulaic** (compare Casting Total to spell Level):

| Casting Total − Level | Cast? | Fatigue lost |
|---|---|---|
| ≥ 0 | Yes | 0 |
| −1 to −10 | Yes | 1 |
| ≤ −11 | No | 1 |

**Resolution — Ritual** (Fatigue lost is *long-term*; if you run out of Fatigue levels you take Wounds — light/medium/heavy/incapacitating for 1/2/3/4 levels beyond what you have):

| Casting Total − Level | Cast? | Fatigue lost |
|---|---|---|
| ≥ 0 | Yes | 1 |
| −1 to −5 | Yes | 2 |
| −6 to −10 | Yes | 3 |
| −11 to −15 | No | 4 |
| ≤ −16 | No | 5 |

**Spontaneous:** decide the intended effect *before* rolling; if the final total is too low for that effect's level, it fails. With a high roll you may spend the surplus on more Range/Duration/Target (not a different effect), or cast lower to boost Penetration.

**Concentration:** if distracted mid-cast, roll **Stamina + Concentration + stress die** vs. an Ease Factor (Walking 3, Running/Jostled/sudden noise 9, Dodging/Knocked down 12, Damaged this round 15). Fail = spell fails. Maintained spells lower these EFs by 3.

---

## 4. Spell Level = Effect + Range + Duration + Target

Guidelines give the **base level** assuming **Range Personal, Duration Momentary, Target Individual**. Each step up a parameter ladder adds **+1 magnitude (+5 levels)**; each step down subtracts one. **Below level 5, each magnitude is only ±1 level** (so one step down from 5 is 4; one step up from 2 is 3).

| Magnitudes | Range | Duration | Target (object / container / sense) |
|---|---|---|---|
| +0 | Personal | Momentary | Individual / Circle / Taste |
| +1 | Touch / Eye | Concentration / Diameter | Part / — / Touch |
| +2 | Voice | Sun / Ring | Group / Room / Smell |
| +3 | Sight | Moon | — / Structure / Hearing |
| +4 | Arcane Connection | Year | — / Boundary / Vision |

**Ranges** (to nearest part of target): **Personal** (caster only; never bypasses own MR issue — see §6); **Touch** (what you touch); **Eye** (eye contact — auto with a calm social human, near-impossible vs. an enemy in combat); **Voice** (firm ~15 paces, quiet ~5, shout ~50; ritual/ceremonial always ~50); **Sight** (anything seen); **Arcane Connection** (anything you have an AC to, any distance).

**Durations:** **Momentary** (a moment, up to ~1 round; effects can persist — a moved rock stays moved); **Concentration** (~15 min per Concentration point, ends if you lose focus); **Diameter** (~2 min / 20 rounds); **Sun** (until next sunrise/sunset); **Ring** (until a drawn ring is broken/crossed); **Moon** (until both new & full moon set); **Year** (must be Ritual). Diameter/Sun/Moon/Year spells can be seamlessly **recast** at expiry to run continuously.

**Targets** — three kinds:
- *Object:* **Individual** (one discrete thing), **Part** (a piece still attached — +1), **Group** (~10 standard Individuals' mass, close together & separated from like things — +2).
- *Container* (needs the container to actually exist): **Circle** (drawn at casting, ends if broken — +0), **Room** (~100 Individuals, enclosed — +2), **Structure** (~10 rooms, one roofed complex — +3), **Boundary** (a real natural/man-made border, must be Ritual — +4).
- *Sense* (Intellego magical senses): **Taste +0, Touch +1, Smell +2, Hearing +3, Vision +4** (Vision doesn't need Ritual).

**Size:** each Form has a base Individual size; **+1 magnitude multiplies max size ×10** (Intellego and Circle ignore size). A Group's base is 10 Individuals' mass.

**Ritual is required if:** the guideline says so; it's a Momentary Creo that creates a lasting thing; Duration Year; Target Boundary; or level > 50 (Formulaic/Spontaneous cap at 50). Rituals are always at least level 20.

---

## 5. Boosting Casts

- **Raw vis:** +2 Casting Score per pawn. Limit: pawns of a given Art ≤ your score in that Art (Technique and Form limited separately). Each pawn adds **+1 botch die** (on a stressed roll). Vis must match Technique or Form. Required for Rituals (1/magnitude — there it enables the cast but doesn't add to score).
- **Words & Gestures** (non-ritual only): bolder = bonus, subtler = penalty. Loud +1 / Firm 0 / Quiet −5 / None −10. Exaggerated +1 / Bold 0 / Subtle −2 / None −5. (Voice range scales with volume: loud 50, firm 15, quiet 5, none = caster only.)
- **Ceremonial casting** (non-ritual, spontaneous): spend 15 min/magnitude to add Artes Liberales + Philosophiae to Casting Score; spell level still capped at 1 magnitude per 15 min. Props add +1 to +5; prepared spaces reduce the time.
- **Fast casting** (spontaneous only, as a reaction): **−10 Casting Score, +2 botch dice**. Speed roll = Quickness + Finesse + stress die vs. the trigger's Ease Factor (in combat = opponent's Initiative Total). A fast-cast *defense* needs the spell at half the attacker's level to protect, or full level to fully neutralize.

---

## 6. Penetration & Magic Resistance

This is the crux of mage-vs-mage and mage-vs-supernatural conflict.

**Penetration Total = Casting Total + Penetration Bonus − Spell Level.**
- Penetration Bonus ≥ your Penetration Ability score, multiplied by sympathetic factors if you have an **Arcane Connection** to the target (×(1 + AC bonus): AC lasting hours/days +1, weeks/months +2, years/decades +3, indefinite +4) plus stacking sympathetic connections (blood relative, true name, horoscope, symbolic representation, etc.; none > +2 each).
- The surplus of Casting Total over spell Level is what penetrates. If Penetration Total ≤ 0, the spell **cannot affect anything with Magic Resistance at all** (even MR 0), but still affects things with *no* MR.

**Magic Resistance (MR):**
- Most humans/animals have **none** — any spell affects them regardless of Penetration (even negative).
- A target with **MR 0** is only affected if Penetration Total ≥ 1 (so MR 0 ≫ no MR).
- A magus's base MR = his score in **the most applicable Form** (Vim if unsure).
- **Parma Magica** adds **5 × Parma score** on top of Form-based MR. Takes 2 min to raise; lasts until next sunrise/sunset. Can protect 1 other person per Parma point by touch (but while protecting others, effective Parma −3 for everyone). Can be suppressed by concentrating (which also drops Form resistance). An *unconscious* magus keeps full Parma and cannot lower it — even helpful magic is blocked.
- **Aura modifier** adjusts MR too: +aura in a Magic aura, −aura in a hostile-realm aura.

**To affect a Magic-Resisting target, Penetration Total must EXCEED the target's MR.** Equal = stopped.

**How MR behaves** (it keeps *magic* off the magus; it does not dispel):
- A Personal-range spell needn't beat the caster's own MR; any other range (even self-cast) must.
- A *magical* jet of water parts around her; a *normal* rock magically propelled stops at her skin; but a normal rock magically lifted and then *released to fall naturally* bypasses MR (its final motion is mundane gravity) — these indirect attacks must be **Aimed**.
- **Forceless casting:** deliberately cap Penetration at 0 so the spell won't affect any magus (useful in tournaments / area spells near allies).

**Aiming** (for indirect effects that don't target the victim directly, so MR is irrelevant but the effect must physically reach): **Perception + Finesse + die**, treated as a combat **attack total** (stress die if under stress, else simple). +6 to the roll per magnitude the direct target is larger than a base Individual; a missile-style projectile also takes the normal range penalty. The hit lands if it beats the target's defense/Soak per the combat rules; the magus gains no Attack Advantage, and damage = stress die + the spell's damage bonus vs. Soak + stress die. (Actual wound/damage scales and per-Form damage values come from the combat rules and the Chapter-9 spell guidelines, which are outside this skill's scope.)

---

## 7. Certamen (the wizard's duel)

Non-lethal magical duel to settle disputes; binding, with formal limits (can't override a Tribunal or force a Code violation). Refusing a challenge = conceding. Both agree on one Technique + Form (aggressor picks Technique, defender picks Form; each may veto the other's first choice once). Both enter a trance (defenseless to physical attack) and manifest dueling phantasms.

- **Initiative** (once): Quickness + Finesse + stress die.
- Each round both roll: **Attack = Presence + (Technique or Form) + stress die**; **Defense = Perception + (the other Art) + stress die**. Each magus must use *both* Arts each round, one for attack, one for defense (may swap assignments round to round).
- If Attack > Defense, **Attack Advantage = difference**. Then **Weakening Total = Intelligence + Penetration + Attack Advantage**; defender subtracts **Resistance = Stamina + Parma** — here Parma is the **raw Ability score** (e.g. 5 for Parma 5), added flat, *not* ×5 as it is for normal Magic Resistance. Per 5 points (or fraction) of surplus, defender loses 1 Fatigue level (certamen causes only Fatigue, never Wounds; if you'd drop below Unconscious, spend 1 extra hour out per extra level).
- Raw vis: +2 to Attack or Defense per pawn (one round), the vis matching whichever of the two dueling Arts you spend it on, ≤ your score in that Art.
- A **Concentration roll** is only needed in certamen if outside conditions disrupt a duelist (it is *not* triggered by losing Fatigue); failing it ends the duel and loses it.
- **Winning:** opponent falls unconscious (winner may cast one free same-Tech/Form spell that bypasses Parma but not Form resistance); opponent concedes (keeps full Parma vs. any final spell); or opponent fails a Concentration roll (no free spell).
- House Tremere always double the *lower* of their Technique/Form in certamen.

---

## 8. Limits of Magic (Hermetic magic CANNOT…)

Divine (can't affect God/miracles/the host); Essential Nature (can't change what a thing fundamentally *is* — Muto must be sustained); Aging (can't reverse natural aging/Decrepitude); Arcane Connections (can't affect an unsensed target without an AC); Creation (no permanent creation without vis); Energy (can't restore Fatigue or Confidence); Experience (can't create/transfer Abilities or knowledge); the Infernal (Intellego only sees demons' lies); Lunar Sphere (nothing at/above the moon); the Soul (can't make a soul, true life, or raise the dead — but soulless animals/created beings are fine); Time (no past/future, no time-scrying); True Feeling (some loves/faiths are untouchable); Vis (can't change vis's attuned Art); Warping (can't undo warping once it happens).

---

## 9. The Gift (social cost)

The Gift makes ordinary people instinctively distrust and envy magi, and makes mundane animals fear/avoid them. A Gifted magus negotiating suffers **−3 to all social rolls** (−6 with the Blatant Gift; the **Gentle Gift** removes the penalty). This is why magi often use ungifted go-betweens — and why two Gifted magi meeting tend toward wariness.

---

## Quick worked example

A magus with Creo 10, Ignem 8, Stamina +2, no encumbrance, in a Magic aura 3, casts a known Formulaic *Pilum of Fire* (Cr Ig, level 20).
- Casting Score = 10 + 8 + 2 − 0 + 3 = **23**.
- Stressed, rolls a 7 → Casting Total = **30**. 30 ≥ 20 ⇒ cast, no fatigue.
- Target is a rival magus with Ignem 5, Parma 4 ⇒ MR = 5 + (5×4) = 25, +3 aura = **28**.
- Penetration Bonus: Penetration Ability 2, no AC ⇒ +2. Penetration Total = 30 + 2 − 20 = **12**.
- 12 < 28 ⇒ the fire is **resisted**; it parts around the rival, who only feels the warning that something was stopped. To get through, the caster needs far more Casting Total, vis, mastery, or an Arcane Connection to multiply Penetration.
