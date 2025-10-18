from flask import Flask, render_template, request, jsonify
import math
from functools import lru_cache

app = Flask(__name__)

# Using LRU cache to memoize results for performance improvement,
# as Grundy numbers are calculated recursively and repeatedly for the same values.
@lru_cache(maxsize=None)
def get_grundy_number(n):
    """
    Calculates the Grundy number (or nim-value) for a given number of items.
    """
    if n <= 2:
        return 0
    
    seen_grundy_numbers = set()
    # A player can split a heap of n into two heaps of size i and n-i.
    # We only need to iterate up to n/2 because (i, n-i) is the same as (n-i, i).
    for i in range(1, math.ceil(n / 2)):
        if i != n - i:
            # The Grundy number of the resulting state is the XOR sum
            # of the Grundy numbers of the two new heaps (Sprague-Grundy theorem).
            seen_grundy_numbers.add(get_grundy_number(i) ^ get_grundy_number(n - i))
            
    # The Grundy number is the smallest non-negative integer not in the set of next states' Grundy numbers.
    # This is also called the Minimum Excluded value (MEX).
    mex = 0
    while mex in seen_grundy_numbers:
        mex += 1
    return mex

@app.route('/')
def index():
    """Renders the main game page."""
    return render_template('index.html')

@app.route('/start', methods=['POST'])
def start_game():
    """Initializes the game with a given number."""
    data = request.get_json()
    number = int(data['number'])
    initial_heaps = [number]
    return jsonify({'heaps': initial_heaps})

@app.route('/move', methods=['POST'])
def handle_move():
    """
    Handles the player's move, checks for a human win,
    then calculates and performs the AI's move, and checks for an AI win.
    Includes AI move details for visualization on the frontend.
    """
    data = request.get_json()
    heaps_after_human_move = [int(h) for h in data['heaps']]

    # --- 1. Check if the HUMAN's move ended the game ---
    if all(h <= 2 for h in heaps_after_human_move):
        return jsonify({
            'heaps': heaps_after_human_move,
            'winner': 'human',
            'ai_move': None  # No AI move was made
        })

    # --- 2. If game continues, it's the AI's turn ---
    nim_sum = 0
    for heap in heaps_after_human_move:
        nim_sum ^= get_grundy_number(heap)

    ai_move_made = False
    heaps_after_ai_move = list(heaps_after_human_move)
    ai_move_details = {}

    # Optimal AI move (when nim_sum is not 0)
    if nim_sum != 0:
        for i, heap_size in enumerate(heaps_after_human_move):
            target_nim_sum = nim_sum ^ get_grundy_number(heap_size)
            if target_nim_sum < get_grundy_number(heap_size):
                for s1 in range(1, math.ceil(heap_size / 2)):
                    s2 = heap_size - s1
                    if s1 != s2:
                        if (get_grundy_number(s1) ^ get_grundy_number(s2)) == target_nim_sum:
                            heaps_after_ai_move.pop(i)
                            heaps_after_ai_move.extend([s1, s2])
                            ai_move_details = {'source_heap_index': i, 'split': [s1, s2]}
                            ai_move_made = True
                            break
            if ai_move_made:
                break
    
    # Sub-optimal AI move (when nim_sum is 0, AI is in a losing position)
    if not ai_move_made:
        for i, heap_size in enumerate(heaps_after_human_move):
            if heap_size > 2:
                s1, s2 = 1, heap_size - 1
                heaps_after_ai_move.pop(i)
                heaps_after_ai_move.extend([s1, s2])
                ai_move_details = {'source_heap_index': i, 'split': [s1, s2]}
                break

    # --- 3. Check for winner and formulate response ---
    winner = 'none'
    if all(h <= 2 for h in heaps_after_ai_move):
        winner = 'ai'

    return jsonify({
        'heaps': heaps_after_ai_move,
        'winner': winner,
        'ai_move': ai_move_details
    })

if __name__ == '__main__':
    app.run(debug=True)