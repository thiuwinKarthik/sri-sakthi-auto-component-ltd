import axios from 'axios';

const API_URL = 'http://localhost:5000/api/un-poured-mould';

export const saveUnPouredMould = (data) =>
  axios.post(API_URL, data);

export const getTotalHeatChange = (disa, entryDate) =>
  axios.get(`${API_URL}/total-heat`, {
    params: { disa, entryDate }
  });
