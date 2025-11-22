from flask import Flask, render_template, request, jsonify
import math
import random
from functools import lru_cache

app = Flask(__name__)

# --- MATH LOGIC (Sprague-Grundy Theorem) ---
@lru_cache(maxsize=None)
def get_grundy_number(n):
    if n <= 2:
        return 0
    seen_grundy_numbers = set()
    for i in range(1, math.ceil(n / 2)):
        if i != n - i:
            seen_grundy_numbers.add(get_grundy_number(i) ^ get_grundy_number(n - i))
    mex = 0
    while mex in seen_grundy_numbers:
        mex += 1
    return mex

def calculate_ai_move(current_heaps):
    """Helper function to calculate the best AI move."""
    nim_sum = 0
    for heap in current_heaps:
        nim_sum ^= get_grundy_number(heap)

    ai_move_made = False
    new_heaps = list(current_heaps)
    ai_move_details = {}

    # 1. Try to find a Winning Move
    if nim_sum != 0:
        for i, heap_size in enumerate(current_heaps):
            target_nim_sum = nim_sum ^ get_grundy_number(heap_size)
            if target_nim_sum < get_grundy_number(heap_size):
                for s1 in range(1, math.ceil(heap_size / 2)):
                    s2 = heap_size - s1
                    if s1 != s2:
                        if (get_grundy_number(s1) ^ get_grundy_number(s2)) == target_nim_sum:
                            new_heaps.pop(i)
                            new_heaps.extend([s1, s2])
                            ai_move_details = {'source_heap_index': i, 'split': [s1, s2]}
                            ai_move_made = True
                            break
            if ai_move_made: break
    
    # 2. If losing (nim_sum is 0), make a random valid move
    if not ai_move_made:
        for i, heap_size in enumerate(current_heaps):
            if heap_size > 2:
                s1, s2 = 1, heap_size - 1
                new_heaps.pop(i)
                new_heaps.extend([s1, s2])
                ai_move_details = {'source_heap_index': i, 'split': [s1, s2]}
                break
                
    return new_heaps, ai_move_details

# --- WEB ROUTES ---
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/start', methods=['POST'])
def start_game():
    data = request.get_json()
    number = int(data['number'])
    heaps = [number]
    
    # Randomize who starts (50% Chance)
    ai_starts = random.choice([True, False])
    ai_move_details = None
    
    if ai_starts:
        heaps, ai_move_details = calculate_ai_move(heaps)
        
    return jsonify({
        'heaps': heaps,
        'ai_started': ai_starts,
        'ai_move': ai_move_details
    })

@app.route('/move', methods=['POST'])
def handle_move():
    data = request.get_json()
    heaps_after_human_move = [int(h) for h in data['heaps']]

    # 1. Did Human Win?
    if all(h <= 2 for h in heaps_after_human_move):
        return jsonify({'heaps': heaps_after_human_move, 'winner': 'human', 'ai_move': None})

    # 2. AI Responds
    heaps_after_ai_move, ai_move_details = calculate_ai_move(heaps_after_human_move)

    # 3. Did AI Win?
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