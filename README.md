# The World in One Day — 18 November 2026

[![make.fun](https://make.fun/badge/news-image-20261118.svg)](https://make.fun/bounty/news-image-20261118)
[![rank](https://make.fun/badge/news-image-20261118/zeinrefo-code/news-image-20261118/rank.svg)](https://make.fun/bounty/news-image-20261118)
[![reward](https://make.fun/badge/news-image-20261118/zeinrefo-code/news-image-20261118/reward.svg)](https://make.fun/bounty/news-image-20261118)

A procedurally drawn newspaper front page summing up **Wednesday 18 November 2026** in five stories: Iranian drones target a US radar in Bahrain (and Kuwait intercepts drones), Trump heads to Shenzhen for APEC after Quad talks in Manila, Anthropic prices its record IPO, Voyager 1 reaches one light-day from Earth, and the Board of Peace warns the Gaza truce may collapse.

The program (`main.ts`, Node 22, standard library only) draws the whole 1024×1024 poster at runtime — hand-rolled PNG encoder (node:zlib deflate, CRC32 written in code) and a 5×7 bitmap font defined in code. No image assets, no network, deterministic output.

## Run

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/entry.png` (1024×1024, under 1 MiB). Two runs produce byte-identical output.

## Bounty

[news-image-20261118 on make.fun](https://make.fun/bounty/news-image-20261118) — sum up 18 November's world news in one image. Referral: https://make.fun/r/bxjfe4p7
