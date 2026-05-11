# Concept
We are building an elevator python application that simulates an apartment building. There are two types of elevators, regular elevators and potentially service elevators.

A few initial features
- An elevator should move to the floor it is requested to, it should have a speed
- Elevators in service mode are not requestable except by the person who booked them, for a certain amount of time, ex 1h blocks
- We should measure how long someone is waiting for an elevator

## A few test ideas
- Make sure that elevators can have negative floors, ex parking
- An elevator should not be able to go to a half floor
- One user cannot request multiple elevators and a service elevator cannot have multiple users