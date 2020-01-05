import React, { useState, useEffect } from 'react';
import styled from 'styled-components'

const BORDER = '1px solid black'

const COLUMNSIZE = 100

const Wrapper = styled.div`
  position: relative;
  width: ${COLUMNSIZE * 4}px;
  height: ${COLUMNSIZE * 4}px;

  .startOverlay {
    position: absolute;
    height: 100%;
    width: 100%;
    top: 0;
    display: flex;
    justify-content: center; 
    align-items: center;
    font-size: 1.4em; 
    background: rgba(0,0,0, .6);
  }

  .row {
    display: flex;
    width: 100%;

    &:last-of-type {
      .column {
        border-bottom: ${BORDER};
      }
    }

    .column:first-of-type {
      border-left: ${BORDER};
    }

    .column {
      
    }
  }
`

const getBackgroundByNumber = (num?: number | null) => {
  switch(num) {
    case 2: return 'yellow'
    case 4: return 'red'
    case 8: return 'green'
    case 16: return 'blue'
    case 32: return 'violet'
    default: {
      return num ? 'yellow' : ''
    }
  }
}

const StyledColumn = styled.div<{number: number | null}>`
  box-sizing: border-box;
  border-right: ${BORDER};
  border-top: ${BORDER};
  background: ${p => getBackgroundByNumber(p.number)};
  height: ${COLUMNSIZE}px;
  width: ${COLUMNSIZE}px;
  display: flex;
  align-items: center;
  justify-content: center;
`

const Controls = styled.div``
const Score = styled.div``

type ColumnProps = {
  id: string
  number: number | null
  didMerge: boolean
}

const Column: React.FC<ColumnProps> = ({ id, number }) => {
  return <StyledColumn number={number} className={`column col_${id}`}>
    {number ? <span>{number}</span> : null}
  </StyledColumn>
}


const generateInitialBoardState = (rows: number, columns: number) => 
  new Array(rows).fill([]).map((v, i) => 
    new Array(columns).fill({}).map((v, j) => ({
      id: `${i}${j}`,
      number: null as number | null,
      didMerge: false
    })
  ))

type ArrowKeyEvent = (event: Event) => void

type ArrowKeyEvents = {
  onDown?: ArrowKeyEvent
  onUp?: ArrowKeyEvent
  onRight?: ArrowKeyEvent
  onLeft?: ArrowKeyEvent
}

const useArrowKeys = (events:ArrowKeyEvents, eventType = 'keydown') => {
  useEffect(() => {
    const listener = (e: Event) => {
      switch((e as KeyboardEvent).key) {
        case 'ArrowDown': {
          events.onDown && events.onDown(e)
          break
        }
        case 'ArrowUp': {
          events.onUp && events.onUp(e)
          break
        }
        case 'ArrowRight': {
          events.onRight && events.onRight(e)
          break
        }
        case 'ArrowLeft': {
          events.onLeft && events.onLeft(e)
          break
        }
      }
    }
    window.addEventListener(eventType, listener)

    return () => {
      window.removeEventListener(eventType, listener)
    }
  }, [])
}


const useBoardManager = (rows: number, columns: number) => {
  const [currentScore, setCurrentScore] = useState(0)
  const [highestScore, setHighestScore] = useState(0) 
  const [hasGameStarted, setGameStarted] = useState(false)
  const [boardState, setBoardState] = useState(generateInitialBoardState(rows, columns))
  const [isGameLost, setGameLost] = useState(false)

  
  const spawnOnRandomFreeSpot = (state: typeof boardState): typeof boardState => {
    const startRow = Math.floor(Math.random() * 4)
    const startCol = Math.floor(Math.random() * 4)
    if(!state[startRow][startCol].number) {
      state[startRow][startCol] = {...state[startRow][startCol], number: 2}
      return state
    } else {
      return spawnOnRandomFreeSpot(state)
    }
  }

  const merge = (col: ColumnProps, nextCol: ColumnProps) => {
    nextCol.number = col.number! + nextCol.number!
    setCurrentScore(currentScore => {
      const nextScore = currentScore + nextCol.number!
      updateHighestScore(nextScore)
      return nextScore
    })
    nextCol.didMerge = true
    col.number = null
  }

  const move = (state: typeof boardState, delimiter: (rowIndex: number, colIndex: number) => boolean, getNextCol: (state: typeof boardState, rowIndex: number, colIndex: number) => ColumnProps) => {

    let didMoveOrMerge = false 

    state.forEach((row, rowIndex) => {
      row.forEach((col, colIndex) => {
        if(col.number) {
          if(delimiter(rowIndex, colIndex)) {
            const nextCol = getNextCol(state, rowIndex, colIndex)

            if(nextCol.number) {
              // nextRow has number
              if(nextCol.number === col.number) {
                // merge both cols
                console.log('merge', col, nextCol)
                merge(col, nextCol)
                didMoveOrMerge = true
              }
            } else {
              // next row is empty move number to this 
              nextCol.number = col.number
              col.number = null
              move(state, delimiter, getNextCol)
              didMoveOrMerge = true
            }
          }
        } 
      })
    })
    return { state, didMoveOrMerge }
  }

  const canSpawn = (state: typeof boardState) => {
    return state.some(row => {
      return row.some(col => col.number === null)
    })
  }

  const resetDidMerge = (state: typeof boardState) => {
    return state.map(row => {
      return row.map(col => ({...col, didMerge: false}))
    })
  }

  const updateHighestScore = (currentScore: number) => {
    setHighestScore(Math.max(currentScore, highestScore))
  }

  const onAfterMove = (nextState: typeof boardState, didMoveOrMerge: boolean) => {
    if(canSpawn(nextState)) {
      if(didMoveOrMerge) {
        setBoardState(spawnOnRandomFreeSpot(resetDidMerge(nextState)))
      } else {
      }
    } else {
      lostGame()
    }
  }

  const lostGame = () => {
    setGameStarted(false)
    setGameLost(true)
    updateHighestScore(currentScore)
  }

  useArrowKeys({
    onDown: () => {
      setBoardState(boardState => {
        const {state: nextBoardState, didMoveOrMerge} = move(
          [...boardState], 
          (rowIndex: number, colIndex: number) => rowIndex < 3, 
          (state: typeof boardState, rowIndex: number, colIndex: number) => state[rowIndex + 1][colIndex]
        )
        onAfterMove(nextBoardState, didMoveOrMerge)
        return nextBoardState
      })
    },
    onLeft: () => {
      setBoardState(boardState => {
        const {state: nextBoardState, didMoveOrMerge} = move(
          [...boardState], 
          (rowIndex: number, colIndex: number) => colIndex > 0,
          (state: typeof boardState, rowIndex: number, colIndex: number) => state[rowIndex][colIndex - 1]
        )
        onAfterMove(nextBoardState, didMoveOrMerge)
        return nextBoardState
      })
    }
    ,
    onRight: () => {
      setBoardState(boardState => {
        const {state: nextBoardState, didMoveOrMerge} = move(
          [...boardState], 
          (rowIndex: number, colIndex: number) => colIndex < 3,
          (state: typeof boardState, rowIndex: number, colIndex: number) => state[rowIndex][colIndex + 1]
        )
        onAfterMove(nextBoardState, didMoveOrMerge)
        return nextBoardState
      })
    },
    onUp: () => {
      setBoardState(boardState => {
        const { state: nextBoardState, didMoveOrMerge } = move(
          [...boardState], 
          (rowIndex: number, colIndex: number) => rowIndex > 0,
          (state: typeof boardState, rowIndex: number, colIndex: number) => state[rowIndex - 1][colIndex]
        )
        onAfterMove(nextBoardState, didMoveOrMerge)
        return nextBoardState
      })
    }
  })

  const startGame = () => {
    setGameStarted(true)
    setGameLost(false)
    setBoardState(
      spawnOnRandomFreeSpot(generateInitialBoardState(rows, columns))
    )
  }

  useEffect(() => startGame(), [])
  
  return {
    hasGameStarted,
    boardState,
    startGame,
    isGameLost,
    currentScore,
    highestScore
  }
}

const Board: React.FC = () => {
  const ROWS = 4 // TODO: Make this customizable
  const COLUMNS = 4 // TODO: Make this customizable
  const { boardState, startGame, hasGameStarted, isGameLost, currentScore, highestScore } = useBoardManager(ROWS, COLUMNS)

  return <>
    <Score>
      <div className='highestScore'>Highest: {highestScore}</div>
      <div className='highestScore'>Current: {currentScore}</div>
    </Score>
    <Wrapper>
      {isGameLost ? <div className='startOverlay'  onClick={startGame}><span>You lost! Click to start</span></div> : 
      !hasGameStarted ? <div className='startOverlay'  onClick={startGame}><span>Click here to start</span></div> : null}
      {boardState.map((row, i) => {
        return <div className={`row row_${i}`} key={i}>{row.map((col) => <Column {...col} key={col.id} />)}</div>
      })}
    </Wrapper>
    <Controls>
      <button onClick={startGame}>
        Reset
      </button>
    </Controls>
  </>
}



const App: React.FC = () => {
  return (
    <Board />
  );
}

export default App;
