# M2r Addendum — Vulture Companion (test)

Replaces the separate Vulture and Squirrel summons. Overrides M1 §15 and M1d §2 on how they are summoned, their costs and their caps. How each job behaves is unchanged. Built on the `vulture-companion` branch to test the idea.

## 1. Jobs
- The summon panel shows **Attack** (Q) and **Collect** (W) in place of the Vulture and Squirrel cards. Bough Double and Slow Wisp are unchanged.
- Choose a job, then click the battlefield. Esc, right-click or the same card cancels.
- Attack is today's Vulture, with its stats. Collect is today's Squirrel, with its stats, drawn as the Vulture.
- Neither job has a time limit: the Vulture keeps at it until it gets a new order or dies. Items that change the Vulture's or Squirrel's duration do nothing here.
- Other Vulture items boost Attack and other Squirrel items boost Collect.

## 2. One Vulture
- Only one job runs at a time. The current job's card is highlighted.
- Giving an order starts a wait of `VULTURE_WAIT` seconds (`data/globals.csv`), in simulation time. The next order can only be given when it is over.
- A new order, even the same job, moves the Vulture to the clicked spot at once. The share of HP it has left carries over.
- Its death does not change the wait: it keeps counting down from the last order.

## 3. Cost
- Each battle starts with no Vulture: the first order costs the Vulture's regular cost, whichever job is chosen.
- Orders while it is alive are free.
- If it dies, it must be paid for again. It can be summoned as soon as the wait is over, or at once if it already was.

## 4. Eyrie Crown
- Now shortens the wait by 3 seconds (stat `vulture.wait`) instead of adding a Vulture.
