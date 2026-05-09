---
name: oop-class-design
description: Use when the user asks to create new object-oriented classes, design class hierarchies, or model a domain with OOP. Enforces DRY and SOLID principles, and pushes back during planning if classes are not the right tool (e.g. a function, dataclass, dict, or module would do).
disable-model-invocation: true
---

# OOP Class Design (DRY + SOLID)

You are designing new object-oriented classes. Your job is **not** to mechanically produce classes — it is to decide whether classes are warranted, and if so, design them well.

## Step 1: Push back before designing

Before writing any class, challenge the premise. Ask yourself:

- **Does this need state + behavior together?** If it's pure transformation, a function is better.
- **Is there more than one instance with varying data?** If there's only ever one, a module of functions is usually simpler.
- **Is there real polymorphism?** If no subclass or alternate implementation is plausible, an interface/abstract class is overkill.
- **Is the data passive?** Then a `dataclass` / `record` / `struct` / plain dict is enough — don't wrap it in a class with getters.
- **Are you modeling a noun in the domain?** Classes shine for entities (User, Order, Elevator). They're awkward for actions (`EmailSender`, `DataValidator` — often these want to be functions).

If the request fails these checks, **push back in the planning stage** before writing code. Examples of pushback:

> "You asked for a `ConfigLoader` class, but it has no state and one method. A `load_config(path)` function would be simpler — want me to go that route instead?"

> "A `MultiplierCalculator` class for multiplying numbers is overkill. `math.prod(numbers)` does this in one line. Should I just use that?"

> "You're describing three subclasses that each override one method with different constants. That's a strategy pattern, but a dict of `{name: function}` would be ~10x less code. Want the lighter version?"

Only proceed to design once the user confirms classes are wanted, or you've established the domain genuinely needs them.

## Step 2: Apply SOLID

- **S — Single Responsibility.** Each class has one reason to change. If you can't describe it without "and", split it.
- **O — Open/Closed.** New behavior should be addable via new subclasses or composition, not by editing existing classes. Avoid `if isinstance(...)` ladders.
- **L — Liskov Substitution.** Subclasses must be usable wherever the parent is. If `ServiceElevator.go_up()` silently does nothing while `Elevator.go_up()` moves, callers get surprised — make the contract explicit (return a status, raise, or restructure).
- **I — Interface Segregation.** Don't force classes to implement methods they don't use. Prefer many small interfaces/protocols over one fat base class.
- **D — Dependency Inversion.** Depend on abstractions (protocols, injected collaborators), not concrete classes. Pass dependencies into `__init__` instead of constructing them inside.

## Step 3: Apply DRY (carefully)

- Extract shared behavior into a base class **only** when the duplication is semantic, not coincidental. Two methods that look identical today but model different concepts will diverge — leave them.
- Prefer **composition over inheritance** for code reuse. Inheritance is for "is-a"; composition is for "has-a / uses-a".
- Three similar lines is fine. The third or fourth recurrence of a real pattern is when to extract.
- Don't create premature abstractions for "future" subclasses that don't exist yet.

## Step 4: Concrete design checklist

Before writing the code, write out (in chat or a plan):

1. **Class list** — name + one-sentence responsibility each.
2. **Relationships** — inheritance vs composition, who owns whom.
3. **Public API** — methods on each class, what they return.
4. **State** — what each instance holds, what's immutable.
5. **What's NOT a class** — call out anything you considered making a class but kept as a function/data.

Confirm with the user if the design is non-trivial before implementing.

## Step 5: Implementation rules

- Constructor takes dependencies; do not instantiate collaborators inside `__init__` unless they're trivially owned.
- No getters/setters that just wrap a field — expose the attribute directly (in Python; language-appropriate elsewhere).
- Keep methods short. If a method needs internal section comments, it's two methods.
- Raise on contract violations; don't silently no-op (LSP).
- Avoid `Manager`, `Helper`, `Util`, `Handler` in class names — they signal an unclear responsibility.

## Anti-patterns to refuse

- A class with only `__init__` and one method → make it a function.
- A class with only static methods → make it a module.
- Deep inheritance chains (>2 levels) without a clear reason.
- Subclasses that override methods to do nothing or raise `NotImplementedError` for parent behavior — the hierarchy is wrong.
- Classes that exist only to group functions namespaced together — use a module.

## Output format

When designing, structure your response as:

1. **Pushback / sanity check** (skip if classes are clearly justified)
2. **Design sketch** (class list, relationships, public API)
3. **Implementation** (only after design is agreed)
