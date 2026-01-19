{/* --- Filters Bar --- */}
<div className="flex flex-wrap gap-4 p-6 bg-slate-100 border-b border-gray-300">
  
  <div className="flex-1 min-w-[120px]">
    <span className="text-[11px] font-black text-gray-600 uppercase block mb-1 tracking-wider">
      Disa Machine
    </span>
    <select 
      name="disa" 
      value={formData.disa} 
      onChange={handleInputChange} 
      className="w-full p-2 text-sm font-bold border-2 border-gray-300 rounded bg-white text-gray-900 focus:border-orange-500 outline-none"
    >
      <option value="I">Disa I</option>
      <option value="II">Disa II</option>
      <option value="III">Disa III</option>
    </select>
  </div>

  <div className="flex-1 min-w-[120px]">
    <span className="text-[11px] font-black text-gray-600 uppercase block mb-1 tracking-wider">
      Production Date
    </span>
    <input 
      type="date" 
      name="date" 
      value={formData.date} 
      onChange={handleInputChange} 
      className="w-full p-2 text-sm font-bold border-2 border-gray-300 rounded bg-white text-gray-900 focus:border-orange-500 outline-none" 
    />
  </div>

  <div className="flex-1 min-w-[120px]">
    <span className="text-[11px] font-black text-gray-600 uppercase block mb-1 tracking-wider">
      Working Shift
    </span>
    {/* 👇 FIXED: Values are now "1", "2", "3" to match Database INT type */}
    <select 
      name="shift" 
      value={formData.shift} 
      onChange={handleInputChange} 
      className="w-full p-2 text-sm font-bold border-2 border-gray-300 rounded bg-white text-gray-900 focus:border-orange-500 outline-none"
    >
      <option value="1">Shift I</option>
      <option value="2">Shift II</option>
      <option value="3">Shift III</option>
    </select>
  </div>

</div>