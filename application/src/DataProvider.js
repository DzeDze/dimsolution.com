import React, { useContext, createContext, useReducer } from "react"

// context for using state
const DataStateContext = createContext()

// context for updating state
const DataDispatchContext = createContext()

// reducer function
const reducer = (state, action) => {
  
    const { type, payload } = action;

  switch(type){
      case "SET_LOGIN":
        return {
          ...state,
          hasLogin: payload
        }
      
      case "SET_METAMASK":
        return {
          ...state,
          MetaMask: payload
        }

      default:
        return state
  }
}

export const DataProvider = ({ children }) => {
    const [state, dispatch] = useReducer(reducer, {
      hasLogin: false,
      MetaMask: {},
    })

    return (
      <DataDispatchContext.Provider value={dispatch}>
          <DataStateContext.Provider value={state}>
             {children}
          </DataStateContext.Provider>
      </DataDispatchContext.Provider>
    )
}

export const useDataStateContext = () => useContext(DataStateContext)
export const useDataDispatchContext = () => useContext(DataDispatchContext)