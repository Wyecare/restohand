import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  token: null,
  status: 'idle',
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Define your reducers here later
  },
});

export const {} = authSlice.actions;
export default authSlice.reducer;
