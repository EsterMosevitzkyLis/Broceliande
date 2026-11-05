# M2r Addendum — Vulture Companion (test)

Replaces the separate Vulture and Squirrel summons. Overrides M1 §15 and M1d §2 on how they are summoned, their costs and their caps. How each job behaves is unchanged. Built on the `vulture-companion` branch to test the idea.

## 1. Jobs
- The summon panel shows **Attack** (Q) and **Collect** (W) in place of the Vulture and Squirrel cards. Bough Double and Slow Wisp are unchanged.
- Choose a job, then click the battlefield. Esc, right-click or the same card cancels.
- Attack is today's Vulture, with its stats. Collect is today's Squirrel, with its stats, drawn as the Vulture.
- Vulture items boost Attack and Squirrel items boost Collect.

## 2. One Vulture
- Only one job runs at a time.
- When the job ends, or the Vulture dies, it waits `VULTURE_WAIT` seconds (`data/globals.csv`), in simulation time.
- It can't be called back early.

## 3. Cost
- Each battle starts with no Vulture: the first send costs the Vulture's regular cost, whichever job is chosen.
- Sends after a finished job are free.
- If it dies, it must be paid for again after the wait.

## 4. Eyrie Crown
- Now shortens the wait by 3 seconds (stat `vulture.wait`) instead of adding a Vulture.
