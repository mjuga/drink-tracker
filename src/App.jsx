import { useState, useEffect } from 'react'
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBk70hqJ7squDaAV-Z2SHbKnkFAKGK8OCU",
  authDomain: "drink-tracker-680e9.firebaseapp.com",
  projectId: "drink-tracker-680e9",
  storageBucket: "drink-tracker-680e9.firebasestorage.app",
  messagingSenderId: "603411282508",
  appId: "1:603411282508:web:b543984aafe77759d6d2e9"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

export default function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [userName, setUserName] = useState('')
  const [tempName, setTempName] = useState('')
  const [drinks, setDrinks] = useState([])
  const [allDrinks, setAllDrinks] = useState([])
  const [drinkType, setDrinkType] = useState('beer')
  const [drinkName, setDrinkName] = useState('')
  const [location, setLocation] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [time, setTime] = useState(new Date().toTimeString().slice(0, 5))
  const [filter, setFilter] = useState('all')
  const [showSuccess, setShowSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState('log')

  const drinkIcons = {
    beer: '🍺',
    wine: '🍷',
    cocktail: '🍸'
  }

  const drinkColors = {
    beer: { gradient: 'from-amber-500 to-amber-400' },
    wine: { gradient: 'from-pink-600 to-pink-400' },
    cocktail: { gradient: 'from-cyan-500 to-cyan-400' }
  }

  useEffect(() => {
    const savedName = localStorage.getItem('userName')
    if (savedName) {
      setUserName(savedName)
    }

    const drinksQuery = query(collection(db, 'drinks'), orderBy('timestamp', 'desc'))
    const unsubscribe = onSnapshot(drinksQuery, (snapshot) => {
      const drinksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setAllDrinks(drinksData)
      if (savedName) {
        setDrinks(drinksData.filter(d => d.userName === savedName))
      }
      setIsLoading(false)
    }, (error) => {
      console.error('Error fetching drinks:', error)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (userName) {
      setDrinks(allDrinks.filter(d => d.userName === userName))
    }
  }, [userName, allDrinks])

  const saveUserName = () => {
    if (!tempName.trim()) return
    const name = tempName.trim()
    setUserName(name)
    localStorage.setItem('userName', name)
  }

  const handleSubmit = async () => {
    if (!drinkName.trim() || !location.trim()) return

    const newDrink = {
      userName: userName,
      type: drinkType,
      name: drinkName,
      location: location,
      date: date,
      time: time,
      timestamp: new Date(date + 'T' + time).toISOString()
    }

    try {
      await addDoc(collection(db, 'drinks'), newDrink)
      setDrinkName('')
      setLocation('')
      setDrinkType('beer')
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } catch (e) {
      console.error('Error adding drink:', e)
    }
  }

  const deleteDrink = async (id) => {
    try {
      await deleteDoc(doc(db, 'drinks', id))
    } catch (e) {
      console.error('Error deleting drink:', e)
    }
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    const today = new Date()
    if (d.toDateString() === today.toDateString()) return 'Today'
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatTime = (timeStr) => {
    const [hours, minutes] = timeStr.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const filteredDrinks = filter === 'all' 
    ? drinks 
    : drinks.filter(d => d.type === filter)

  const stats = {
    total: drinks.length,
    beer: drinks.filter(d => d.type === 'beer').length,
    wine: drinks.filter(d => d.type === 'wine').length,
    cocktail: drinks.filter(d => d.type === 'cocktail').length,
  }

  const favoriteType = stats.total > 0 
    ? Object.entries({ beer: stats.beer, wine: stats.wine, cocktail: stats.cocktail })
        .sort((a, b) => b[1] - a[1])[0][0]
    : null

  const locationCounts = drinks.reduce((acc, d) => {
    acc[d.location] = (acc[d.location] || 0) + 1
    return acc
  }, {})
  
  const topLocations = Object.entries(locationCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  const drinkCounts = drinks.reduce((acc, d) => {
    acc[d.name] = (acc[d.name] || 0) + 1
    return acc
  }, {})

  const topDrinks = Object.entries(drinkCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  const uniqueDays = new Set(drinks.map(d => d.date)).size
  const avgPerDay = uniqueDays > 0 ? (stats.total / uniqueDays).toFixed(1) : 0

  const friendsData = allDrinks.reduce((acc, drink) => {
    if (!acc[drink.userName]) {
      acc[drink.userName] = { total: 0, beer: 0, wine: 0, cocktail: 0, lastDrink: null }
    }
    acc[drink.userName].total++
    acc[drink.userName][drink.type]++
    if (!acc[drink.userName].lastDrink || new Date(drink.timestamp) > new Date(acc[drink.userName].lastDrink.timestamp)) {
      acc[drink.userName].lastDrink = drink
    }
    return acc
  }, {})

  const friendsList = Object.entries(friendsData)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total)

  const recentActivity = [...allDrinks]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)' }}>
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">🍻</div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!userName) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)' }}>
        <div className="max-w-sm w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-cyan-400 bg-clip-text text-transparent mb-2">
              Drink Tracker
            </h1>
            <p className="text-gray-400 text-sm">Log your beverages, track your year</p>
            <span className="inline-block mt-3 px-3 py-1 bg-gradient-to-r from-pink-600 to-amber-500 text-white text-xs font-semibold rounded-full">
              2026 EDITION
            </span>
          </div>

          <div className="bg-slate-800/80 rounded-3xl p-6 shadow-2xl border border-white/10">
            <h2 className="text-xl font-semibold text-white mb-2 text-center">Welcome!</h2>
            <p className="text-gray-400 text-sm text-center mb-6">Enter your name to get started</p>
            
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveUserName()}
              placeholder="Your name"
              className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:bg-white/10 transition-all text-center text-lg mb-4"
              autoFocus
            />
            
            <button
              onClick={saveUserName}
              className="w-full py-4 bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/30"
            >
              Start Tracking
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 pb-24 md:p-8 md:pb-8" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #1a1a2e 100%)' }}>
      {showSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full font-medium shadow-lg z-50 animate-pulse">
          ✓ Drink logged successfully!
        </div>
      )}

      <div className="max-w-md mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-cyan-400 bg-clip-text text-transparent mb-1">
            Drink Tracker
          </h1>
          <p className="text-gray-400 text-sm">Welcome back, <span className="text-white">{userName}</span>!</p>
        </header>

        <div className="flex gap-2 mb-6 bg-slate-800/50 p-1 rounded-2xl">
          {[
            { id: 'log', label: '🍷 Log', },
            { id: 'friends', label: '👥 Friends' },
            { id: 'stats', label: '📊 Stats' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-slate-700 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'log' && (
          <>
            <div className="bg-slate-800/80 rounded-3xl p-6 shadow-2xl border border-white/10 mb-6">
              <h2 className="text-xl font-semibold text-white mb-5 flex items-center gap-2">
                🍷 Log a Drink
              </h2>

              <div className="grid grid-cols-3 gap-3 mb-5">
                {['beer', 'wine', 'cocktail'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setDrinkType(type)}
                    className={`p-4 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center gap-2 ${
                      drinkType === type
                        ? type === 'beer' 
                          ? 'border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-400/20'
                          : type === 'wine'
                          ? 'border-pink-500 bg-pink-500/10 shadow-lg shadow-pink-500/20'
                          : 'border-cyan-400 bg-cyan-400/10 shadow-lg shadow-cyan-400/20'
                        : 'border-white/10 bg-transparent hover:border-white/20'
                    }`}
                  >
                    <span className="text-2xl">{drinkIcons[type]}</span>
                    <span className={`text-sm capitalize ${drinkType === type ? 'text-white' : 'text-gray-400'}`}>
                      {type}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-2">What did you have?</label>
                <input
                  type="text"
                  value={drinkName}
                  onChange={(e) => setDrinkName(e.target.value)}
                  placeholder="e.g., Guinness, Merlot, Margarita"
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:bg-white/10 transition-all"
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-400 text-sm mb-2">Where were you?</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., The Local Pub, Home"
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 focus:bg-white/10 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-400 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Time</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-cyan-400 transition-all"
                  />
                </div>
              </div>

              <button
                onClick={handleSubmit}
                className="w-full py-4 bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 text-white font-semibold rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-pink-500/30 hover:-translate-y-0.5 active:translate-y-0"
              >
                Log This Drink
              </button>
            </div>

            <div className="bg-slate-800/80 rounded-3xl p-6 shadow-2xl border border-white/10">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  📋 Your History
                </h2>
                <span className="bg-white/10 px-3 py-1 rounded-full text-sm text-gray-300">
                  <span className="text-white font-semibold">{drinks.length}</span> drinks
                </span>
              </div>

              <div className="flex gap-2 mb-5 flex-wrap">
                {['all', 'beer', 'wine', 'cocktail'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 rounded-full text-sm transition-all ${
                      filter === f
                        ? 'bg-white/15 text-white border border-white/20'
                        : 'text-gray-400 border border-white/10 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {f === 'all' ? 'All' : `${drinkIcons[f]} ${f.charAt(0).toUpperCase() + f.slice(1)}`}
                  </button>
                ))}
              </div>

              {filteredDrinks.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-5xl mb-4 opacity-50">🍹</div>
                  <p className="text-gray-400">
                    {drinks.length > 0 ? `No ${filter} drinks logged yet.` : 'No drinks logged yet.'}
                    <br />
                    {drinks.length === 0 && 'Add your first drink above!'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                  {filteredDrinks.map((drink) => (
                    <div
                      key={drink.id}
                      className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all group"
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                        drink.type === 'beer' ? 'bg-amber-400/15' :
                        drink.type === 'wine' ? 'bg-pink-500/15' : 'bg-cyan-400/15'
                      }`}>
                        {drinkIcons[drink.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium truncate">{drink.name}</div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
                          <span>📍 {drink.location}</span>
                          <span>📅 {formatDate(drink.date)}</span>
                          <span>🕐 {formatTime(drink.time)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteDrink(drink.id)}
                        className="w-9 h-9 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center opacity-50 group-hover:opacity-100 hover:bg-red-500/20 transition-all"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'friends' && (
          <>
            <div className="bg-slate-800/80 rounded-3xl p-6 shadow-2xl border border-white/10 mb-6">
              <h2 className="text-xl font-semibold text-white mb-5 flex items-center gap-2">
                🏆 Leaderboard
              </h2>

              {friendsList.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3 opacity-50">👥</div>
                  <p className="text-gray-400 text-sm">No activity yet. Be the first to log a drink!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {friendsList.map((friend, index) => (
                    <div
                      key={friend.name}
                      className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                        friend.name === userName
                          ? 'bg-pink-500/10 border-pink-500/30'
                          : 'bg-white/5 border-white/10'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                        index === 0 ? 'bg-amber-500 text-black' :
                        index === 1 ? 'bg-gray-400 text-black' :
                        index === 2 ? 'bg-amber-700 text-white' :
                        'bg-slate-600 text-white'
                      }`}>
                        {index < 3 ? ['🥇', '🥈', '🥉'][index] : index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium flex items-center gap-2">
                          {friend.name}
                          {friend.name === userName && (
                            <span className="text-xs bg-pink-500/30 text-pink-300 px-2 py-0.5 rounded-full">You</span>
                          )}
                        </div>
                        <div className="flex gap-2 text-xs text-gray-400">
                          <span>{friend.beer}🍺</span>
                          <span>{friend.wine}🍷</span>
                          <span>{friend.cocktail}🍸</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">{friend.total}</div>
                        <div className="text-xs text-gray-400">drinks</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-800/80 rounded-3xl p-6 shadow-2xl border border-white/10">
              <h2 className="text-xl font-semibold text-white mb-5 flex items-center gap-2">
                ⚡ Recent Activity
              </h2>

              {recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3 opacity-50">📭</div>
                  <p className="text-gray-400 text-sm">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {recentActivity.map((drink) => (
                    <div
                      key={drink.id}
                      className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10"
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                        drink.type === 'beer' ? 'bg-amber-400/15' :
                        drink.type === 'wine' ? 'bg-pink-500/15' : 'bg-cyan-400/15'
                      }`}>
                        {drinkIcons[drink.type]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm">
                          <span className={`font-medium ${drink.userName === userName ? 'text-pink-400' : 'text-white'}`}>
                            {drink.userName === userName ? 'You' : drink.userName}
                          </span>
                          <span className="text-gray-400"> had </span>
                          <span className="text-white">{drink.name}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          📍 {drink.location} • {formatDate(drink.date)} at {formatTime(drink.time)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'stats' && (
          <div className="bg-slate-800/80 rounded-3xl p-6 shadow-2xl border border-white/10">
            <h2 className="text-xl font-semibold text-white mb-5 flex items-center gap-2">
              📊 Your Stats
            </h2>

            {stats.total === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-3 opacity-50">📈</div>
                <p className="text-gray-400 text-sm">Log some drinks to see your stats!</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 rounded-2xl p-4 border border-purple-500/20">
                    <div className="text-3xl font-bold text-white mb-1">{stats.total}</div>
                    <div className="text-gray-400 text-sm">Total Drinks</div>
                  </div>
                  <div className="bg-gradient-to-br from-cyan-600/20 to-blue-600/20 rounded-2xl p-4 border border-cyan-500/20">
                    <div className="text-3xl font-bold text-white mb-1">{avgPerDay}</div>
                    <div className="text-gray-400 text-sm">Avg per Day</div>
                  </div>
                </div>

                <div className="mb-5">
                  <div className="text-sm text-gray-400 mb-3">By Type</div>
                  <div className="space-y-2">
                    {['beer', 'wine', 'cocktail'].map((type) => {
                      const count = stats[type]
                      const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0
                      return (
                        <div key={type} className="flex items-center gap-3">
                          <span className="text-lg w-6">{drinkIcons[type]}</span>
                          <div className="flex-1">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-300 capitalize">{type}</span>
                              <span className="text-gray-400">{count}</span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${drinkColors[type].gradient} transition-all duration-500`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {favoriteType && (
                  <div className="bg-white/5 rounded-2xl p-4 mb-5 border border-white/10">
                    <div className="text-sm text-gray-400 mb-2">Favorite Type</div>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{drinkIcons[favoriteType]}</span>
                      <div>
                        <div className="text-white font-semibold capitalize">{favoriteType}</div>
                        <div className="text-gray-400 text-sm">{stats[favoriteType]} drinks ({Math.round((stats[favoriteType] / stats.total) * 100)}%)</div>
                      </div>
                    </div>
                  </div>
                )}

                {topDrinks.length > 0 && (
                  <div className="mb-5">
                    <div className="text-sm text-gray-400 mb-3">Top Drinks</div>
                    <div className="space-y-2">
                      {topDrinks.map(([name, count], index) => (
                        <div key={name} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-amber-500 text-black' :
                            index === 1 ? 'bg-gray-400 text-black' :
                            'bg-amber-700 text-white'
                          }`}>
                            {index + 1}
                          </span>
                          <span className="flex-1 text-white truncate">{name}</span>
                          <span className="text-gray-400 text-sm">{count}x</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {topLocations.length > 0 && (
                  <div>
                    <div className="text-sm text-gray-400 mb-3">Top Locations</div>
                    <div className="space-y-2">
                      {topLocations.map(([loc, count]) => (
                        <div key={loc} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                          <span className="text-lg">📍</span>
                          <span className="flex-1 text-white truncate">{loc}</span>
                          <span className="text-gray-400 text-sm">{count} visits</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
