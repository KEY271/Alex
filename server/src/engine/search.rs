use chrono::{DateTime, Local, TimeDelta};

use super::{
    eval::eval,
    movegen::{is_legal, GenType, MoveList},
    movepick::MovePicker,
    position::Position,
    util::{move_to_mfen, Move, Value, VALUE_INF},
};

struct TimeKeeper {
    start: DateTime<Local>,
    duration: TimeDelta,
}

impl TimeKeeper {
    fn new(duration: f64) -> Self {
        let start = chrono::Local::now();
        let secs = duration.floor() as i64;
        let nanos = ((duration - secs as f64) * 1e9) as u32;
        let duration = TimeDelta::new(secs, nanos).unwrap();

        TimeKeeper { start, duration }
    }

    fn passed(&self) -> bool {
        let now = chrono::Local::now();
        now - self.start > self.duration
    }
}

fn search(position: &mut Position, time: f64) -> Option<Move> {
    let keeper = TimeKeeper::new(time);
    let mut moves = MoveList::new();
    moves.generate(position, GenType::Legal);
    let mut depth = 3;
    let mut result = Vec::new();
    loop {
        let res = search_root(&moves, position, -VALUE_INF, VALUE_INF, depth, &keeper);
        if !keeper.passed() {
            result = res;
        } else {
            break;
        }
        depth += 1;
    }
    println!("Depth: {}", depth);
    result.into_iter().max_by_key(|v| v.1).map(|x| x.0)
}

fn search_root(
    moves: &MoveList,
    position: &mut Position,
    alpha: Value,
    beta: Value,
    depth: usize,
    keeper: &TimeKeeper,
) -> Vec<(Move, Value)> {
    let mut vec = Vec::new();

    let mut alpha = alpha;

    for i in 0..moves.size {
        if keeper.passed() {
            return vec;
        }
        let mv = moves.at(i).mv;
        position.do_move(mv, None);
        let ev = -search_node(position, -beta, -alpha, depth - 1, keeper);
        vec.push((mv, ev));
        position.undo_move(mv);
        if ev > alpha {
            alpha = ev;
        }
        if alpha >= beta {
            return vec;
        }
    }

    vec
}

fn search_node(
    position: &mut Position,
    alpha: Value,
    beta: Value,
    depth: usize,
    keeper: &TimeKeeper,
) -> Value {
    if keeper.passed() {
        return VALUE_INF;
    }

    if depth <= 0 {
        return eval(position);
    }

    let mut bestvalue = -VALUE_INF;
    let mut alpha = alpha;

    let mut picker = MovePicker::new(position);
    loop {
        let mv = picker.next_move(position);
        if let Some(mv) = mv {
            if !is_legal(position, mv) {
                continue;
            }

            position.do_move(mv, None);
            let ev = -search_node(position, -beta, -alpha, depth - 1, keeper);
            position.undo_move(mv);

            if ev > bestvalue {
                bestvalue = ev;
            }
            if ev > alpha {
                alpha = ev;
            }
            if alpha >= beta {
                break;
            }
        } else {
            break;
        }
    }

    bestvalue
}

pub fn bestmove(position: &mut Position, time: f64) -> String {
    let mv = search(position, time);
    if let Some(mv) = mv {
        move_to_mfen(mv, position.side)
    } else {
        "S".to_string()
    }
}
