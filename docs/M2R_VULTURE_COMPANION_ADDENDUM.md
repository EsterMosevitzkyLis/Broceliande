# M2r Addendum — Vulture Companion (test)

Replaces the separate Vulture and Squirrel summons with one Vulture. Overrides M1 §15 and M1d §2. Built on the `vulture-companion` branch to test the idea.

## 1. Sending it
- The summon panel shows one card, **Send Vulture** (Q), in place of the Vulture and Squirrel cards. Bough Double and Slow Wisp are unchanged. The W key does nothing.
- Press Q and a circle of `VULTURE_SPOT_RADIUS` follows the cursor. Click the battlefield to send it. Esc, right-click or the same card cancels.
- It flies there from where it is. A new Vulture sets off from the Druid.

## 2. What it does
1. Enemies in the circle: it attacks them, flying straight to them. It chases the enemy it is fighting until that enemy dies, even out of the circle.
2. Then drops in the circle: it collects them.
3. Spot empty after that: it leaves the spot and goes to the nearest enemy or drop anywhere, one target at a time, with no new circle.
4. Spot empty when ordered: it guards there until something enters, deals with it, then moves on as in step 3.
5. Nothing anywhere: it hovers where it is until something appears.

- It has no time limit. It keeps going until it gets a new order or dies.
- It holds enemies in place while landed, fighting or guarding, not while collecting.
- It always uses the Vulture's HP, speed and damage. The Squirrel's pickup range and double pickup chance still apply. The Squirrel's other stats and its strike-back are gone.
- Items that change a duration, or the Squirrel's HP, speed or damage, do nothing here.

## 3. Wait
- Giving an order starts a wait of `VULTURE_WAIT` seconds, in simulation time. The next order can only be given when it is over, even mid-flight.
- Its death does not change the wait: it keeps counting down from the last order.

## 4. Cost
- Each battle starts with no Vulture: the first order costs the Vulture's regular cost.
- Orders while it is alive are free.
- If it dies, it must be paid for again. It can be summoned as soon as the wait is over, or at once if it already was. A new Vulture has full HP.

## 5. Eyrie Crown
- Now shortens the wait by 3 seconds (stat `vulture.wait`) instead of adding a Vulture.
