# Pitch clips

Video the deck plays, one file per clip, served from `/pitch/clips/`.

- MP4, H.264, no audio track. The deck plays everything muted.
- 1280x720 or wider, 16:9, to match the stage.
- Name the file after what it shows: `matcher.mp4`, `panel.mp4`.

A screen plays one with `components/pitch/Clip.tsx`:

```tsx
<Clip src="/pitch/clips/matcher.mp4" label="The matcher grouping 252 part numbers" play={active && step >= 2} />
```

A file that is not here yet renders a labelled frame naming the path it is
waiting for, so the deck runs with no clips at all. `/pitch/clips` is a bench
page that shows each one and its placeholder.
