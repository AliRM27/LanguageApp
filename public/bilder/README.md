# Bilder

Pictures that are part of an exam task — currently only Sprechen Teil 2, where
describing the picture *is* the task. Unlike the audio, these are not generated;
they are photographs you choose and save by hand.

The path comes from the content file. A stimulus with

```json
"image": { "src": "/bilder/de/b1/uebungstest-b1-01/sprechen-bild.jpg", "alt": "…" }
```

expects the file at `public/bilder/de/b1/uebungstest-b1-01/sprechen-bild.jpg`.

`npm run check:release` reports any picture that is referenced but missing. For
a test marked `"draft": true` that is a warning; for a published test it fails
the check, because a Bildbeschreibung without a picture is not a task.

Until the file exists the page shows a clear notice with the scene description
instead of a broken image, so a new test can be reviewed before anyone has gone
looking for a photograph.

## Where to get them

[Pexels](https://www.pexels.com/) and [Unsplash](https://unsplash.com/) both
allow commercial use without attribution. Do not take pictures from a search
engine: in Germany that is a reliable way to receive an Abmahnung.

**A free licence is not the whole story.** The licence comes from the
photographer and says nothing about the people in the photograph. Under § 22 KUG
identifiable people have their own say in how their picture is used, and stock
sites do not promise model releases.

So: **choose a picture in which nobody is clearly identifiable** — people seen
from behind, at middle distance, or a frame that concentrates on hands and
objects. This costs nothing pedagogically. A description task is about the
situation, the place, the activity and the mood, never about faces.

## What makes a good picture for this task

- **One clear situation.** The learner has to talk for two to three minutes, so
  there must be enough happening: several people, an obvious place, a visible
  activity.
- **Everyday, not exotic.** The second half of the task asks the learner to
  compare it with their own life. That only works for something they might
  plausibly have done.
- **Landscape, at least ~1200 px wide.** It is displayed full width of the
  content column.
- **No readable text in the picture.** German signage turns a speaking task into
  a reading task; text in another language is a distraction.

## After adding one

The `alt` text in the content file is not decoration. It is read aloud by screen
readers, and it is what appears while the file is missing — so it has to
describe the actual photograph. The Musterlösung describes the same scene.

If your picture differs from what is written there, both need updating, or the
model answer will describe something the learner cannot see.
