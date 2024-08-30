import { useState } from "react";
import { PieceType, Position, Side } from "../utils/game";

type BoardProps = {
    position: Position;
    setCount: React.Dispatch<React.SetStateAction<number>>;
};

class State {
    selected: number;
    movables: number[];
    history: number[];
    side: number;
    hand: number;

    constructor(selected: number, movables: number[], history: number[], side: number, hand: number) {
        this.selected = selected;
        this.movables = movables;
        this.history = history;
        this.side = side;
        this.hand = hand;
    }
}

function Board(props: BoardProps) {
    const { position, setCount } = props;

    const [state, setState] = useState<State>(new State(-1, [], [], Side.None, 0));

    const board = Array(64)
        .fill(0)
        .map((_, i) => {
            const iy = Math.floor((63 - i) / 8);
            const ix = i % 8;
            const j = iy * 8 + ix;
            const [name, side] = position.piece(ix, iy);
            const puttable =
                side == Side.None && ((state.side == Side.Black && iy <= 4) || (state.side == Side.White && iy >= 3));
            const onClick = () => {
                if (state.movables.includes(j)) {
                    const from = position.square(state.selected);
                    const to = position.square(j);
                    fetch("http://127.0.0.1:3001/api/move", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ mfen: from + to })
                    }).then(() => {
                        setState(new State(-1, [], [state.selected, j], Side.None, 0));
                        setCount((c) => c + 1);
                    });
                    return;
                }
                if (puttable) {
                    const to = position.square(j);
                    const hand =
                        position.side == Side.Black ? position.hand_black[state.hand] : position.hand_white[state.hand];
                    const typ = position.piece_mfen(hand[0], position.side);
                    fetch("http://127.0.0.1:3001/api/move", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({ mfen: to + typ })
                    }).then(() => {
                        setState(new State(-1, [], [j], Side.None, 0));
                        setCount((c) => c + 1);
                    });
                    return;
                }
                if (side != position.side) {
                    setState(new State(-1, [], [], Side.None, 0));
                } else {
                    const movables = position.movable(ix, iy);
                    setState(new State(j, movables, [], Side.None, 0));
                }
            };
            return (
                <div key={j} className="box-border border-b-2 border-r-2 border-black bg-[bisque]">
                    <div
                        onClick={onClick}
                        data-rev={side == Side.White}
                        data-piece={side == position.side || state.movables.includes(j) || puttable}
                        data-selected={state.selected == j}
                        data-movable={state.movables.includes(j) || puttable}
                        data-history={state.history.includes(j)}
                        className="flex h-full w-full select-none items-center justify-center border-red-500 text-[20px]
                            data-[rev=true]:rotate-180 data-[piece=true]:cursor-pointer data-[selected=true]:border-2
                            data-[history=true]:bg-[lightsalmon] data-[movable=true]:bg-[darksalmon] sm:text-[30px]">
                        {name}
                    </div>
                </div>
            );
        });
    const file = [..."ABCDEFGH"].map((v, i) => {
        return (
            <div key={i} className="flex h-[20px] w-[40px] select-none items-center justify-center sm:w-[60px]">
                {v}
            </div>
        );
    });
    const rank = Array(8)
        .fill(0)
        .map((_, i) => {
            return (
                <div key={i} className="flex h-[40px] w-[20px] select-none items-center justify-center sm:h-[60px]">
                    {i + 1}
                </div>
            );
        });
    const hand = (side: Side) => (v: [PieceType, number], i: number) => {
        const [pt, n] = v;
        const name = position.piecename(pt)[0];
        const count = n == 1 ? "" : n.toString();
        const onClick = () => {
            if (position.side == side) {
                setState(new State(-1, [], [], side, i));
            }
        };
        return (
            <div
                key={i}
                data-turn={position.side == side}
                className="flex select-none text-[20px] data-[turn=true]:cursor-pointer sm:text-[30px]"
                onClick={onClick}>
                <div
                    data-selected={side == state.side && i == state.hand}
                    className="border-2 border-transparent data-[selected=true]:border-red-500">
                    {name}
                </div>
                {count}
            </div>
        );
    };
    const hand_black = position.hand_black.map(hand(Side.Black));
    const hand_white = position.hand_white.map(hand(Side.White));
    return (
        <>
            <div className="flex flex-col">
                <div className="flex h-[40px] w-full rotate-180 gap-4">{hand_white}</div>
                <div
                    data-turn={position.side == Side.White}
                    className="w-full rotate-180 select-none p-2 data-[turn=true]:text-red-600
                        data-[turn=true]:underline">
                    後手
                </div>
                <div
                    className="grid grid-cols-[20px_320px_20px] grid-rows-[20px_320px_20px]
                        sm:grid-cols-[20px_480px_20px] sm:grid-rows-[20px_480px_20px]">
                    <div
                        className="col-[2] row-[2] box-border grid h-[322px] w-[322px] grid-cols-[repeat(8,40px)]
                            grid-rows-[repeat(8,40px)] border-l-2 border-t-2 border-black sm:h-[482px] sm:w-[482px]
                            sm:grid-cols-[repeat(8,60px)] sm:grid-rows-[repeat(8,60px)]">
                        {board}
                    </div>
                    <div className="col-[2] row-[3] flex flex-row">{file}</div>
                    <div className="col-[2] row-[1] flex rotate-180 flex-row-reverse">{file}</div>
                    <div className="col-[1] row-[2] flex flex-col-reverse">{rank}</div>
                    <div className="col-[3] row-[2] flex rotate-180 flex-col">{rank}</div>
                </div>
                <div
                    data-turn={position.side == Side.Black}
                    className="w-full select-none p-2 data-[turn=true]:text-red-600 data-[turn=true]:underline">
                    先手
                </div>
                <div className="flex h-[40px] w-full gap-4 text-[20px]">{hand_black}</div>
            </div>
        </>
    );
}

export default Board;
