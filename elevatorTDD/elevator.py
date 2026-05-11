class Elevator:
    def __init__(self, current_floor=0):
        self.current_floor = current_floor

    def call_to(self, floor):
        self.current_floor = floor
