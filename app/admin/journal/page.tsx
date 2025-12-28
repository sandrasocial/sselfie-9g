'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { AdminNav } from '@/components/admin/admin-nav'

export default function WeeklyJournalPage() {
  const [journal, setJournal] = useState({
    features_built: '',
    personal_story: '',
    struggles: '',
    wins: '',
    fun_activities: '',
    weekly_goals: '',
    future_self_vision: ''
  })
  
  const [enhancing, setEnhancing] = useState(false)
  const [enhanced, setEnhanced] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [published, setPublished] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const loadJournal = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/journal/current')
      const data = await response.json()
      
      if (data.success && data.journal) {
        setJournal({
          features_built: data.journal.features_built || '',
          personal_story: data.journal.personal_story || '',
          struggles: data.journal.struggles || '',
          wins: data.journal.wins || '',
          fun_activities: data.journal.fun_activities || '',
          weekly_goals: data.journal.weekly_goals || '',
          future_self_vision: data.journal.future_self_vision || ''
        })
        
        // If enhanced versions exist, set those too
        if (data.journal.features_built_enhanced || data.journal.personal_story_enhanced) {
          setEnhanced({
            features_built_enhanced: data.journal.features_built_enhanced || null,
            personal_story_enhanced: data.journal.personal_story_enhanced || null,
            struggles_enhanced: data.journal.struggles_enhanced || null,
            wins_enhanced: data.journal.wins_enhanced || null,
            future_self_vision_enhanced: data.journal.future_self_vision_enhanced || null
          })
        }
      }
    } catch (error) {
      console.error('Error loading journal:', error)
    } finally {
      setLoading(false)
    }
  }
  
  // Load existing journal entry on mount
  useEffect(() => {
    loadJournal()
  }, [])
  
  // Auto-save draft every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (journal.features_built || journal.personal_story) {
        saveDraft()
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [journal])
  
  const saveDraft = async () => {
    if (saving) return
    setSaving(true)
    
    try {
      await fetch('/api/admin/journal/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...journal, published: false })
      })
    } catch (error) {
      console.error('Error saving draft:', error)
    } finally {
      setSaving(false)
    }
  }
  
  const enhanceWithAI = async () => {
    setEnhancing(true)
    
    try {
      const response = await fetch('/api/admin/journal/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(journal)
      })
      
      if (!response.ok) {
        throw new Error('Failed to enhance')
      }
      
      const data = await response.json()
      setEnhanced(data.enhanced)
    } catch (error) {
      console.error('Error enhancing:', error)
      alert('Failed to enhance content. Please try again.')
    } finally {
      setEnhancing(false)
    }
  }
  
  const publishJournal = async () => {
    setSaving(true)
    
    try {
      const response = await fetch('/api/admin/journal/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...journal,
          ...enhanced,
          published: true
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to publish')
      }
      
      // Reset form
      setJournal({
        features_built: '',
        personal_story: '',
        struggles: '',
        wins: '',
        fun_activities: '',
        weekly_goals: '',
        future_self_vision: ''
      })
      setEnhanced(null)
      setPublished(true)
      
      setTimeout(() => setPublished(false), 3000)
    } catch (error) {
      console.error('Error publishing:', error)
      alert('Failed to publish journal. Please try again.')
    } finally {
      setSaving(false)
    }
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50">
        <AdminNav />
        <div className="max-w-4xl mx-auto p-8">
          <p className="text-sm tracking-[0.2em] uppercase text-stone-400 text-center">
            Loading journal...
          </p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-stone-50">
      <AdminNav />
      <div className="max-w-4xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Weekly Journal</h1>
          <p className="text-gray-600">
            Share your week with Alex - features you built, stories, struggles, and wins.
            Alex will use this to create authentic content in your voice.
          </p>
          {saving && (
            <p className="text-sm text-gray-500 mt-2">Auto-saving...</p>
          )}
          {published && (
            <p className="text-sm text-green-600 mt-2">Published to Alex's knowledge!</p>
          )}
        </div>
        
        {/* Product Updates */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3 tracking-[0.2em] uppercase">WHAT I BUILT THIS WEEK</h2>
          <p className="text-sm text-gray-600 mb-3">
            Quick notes or bullets about features, updates, improvements
          </p>
          <Textarea
            value={journal.features_built}
            onChange={(e) => setJournal({...journal, features_built: e.target.value})}
            placeholder="- Fixed analytics bugs&#10;- Built Maya Pro Mode&#10;- Added Flodesk integration"
            rows={4}
            className="mb-2"
          />
          {enhanced?.features_built_enhanced && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-semibold mb-2">AI Enhanced:</p>
              <p className="text-sm whitespace-pre-wrap">{enhanced.features_built_enhanced}</p>
            </div>
          )}
        </Card>
        
        {/* Personal Story */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3 tracking-[0.2em] uppercase">MY STORY THIS WEEK</h2>
          <p className="text-sm text-gray-600 mb-3">
            What happened? Challenges? Breakthroughs? Be real and raw.
          </p>
          <Textarea
            value={journal.personal_story}
            onChange={(e) => setJournal({...journal, personal_story: e.target.value})}
            placeholder="Keynoted at Versace Mansion. Felt imposter syndrome. Kids were sick. But we hit $2k MRR!"
            rows={5}
            className="mb-2"
          />
          {enhanced?.personal_story_enhanced && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-semibold mb-2">AI Enhanced:</p>
              <p className="text-sm whitespace-pre-wrap">{enhanced.personal_story_enhanced}</p>
            </div>
          )}
        </Card>
        
        {/* Struggles */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3 tracking-[0.2em] uppercase">THIS WEEK'S STRUGGLES</h2>
          <Textarea
            value={journal.struggles}
            onChange={(e) => setJournal({...journal, struggles: e.target.value})}
            placeholder="- Imposter syndrome before keynote&#10;- Overwhelmed by tech complexity&#10;- Felt guilty about work-life balance"
            rows={3}
          />
          {enhanced?.struggles_enhanced && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-semibold mb-2">AI Enhanced:</p>
              <p className="text-sm whitespace-pre-wrap">{enhanced.struggles_enhanced}</p>
            </div>
          )}
        </Card>
        
        {/* Wins */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3 tracking-[0.2em] uppercase">THIS WEEK'S WINS</h2>
          <Textarea
            value={journal.wins}
            onChange={(e) => setJournal({...journal, wins: e.target.value})}
            placeholder="- Hit $2k MRR!&#10;- Keynoted successfully&#10;- Got amazing testimonial from customer"
            rows={3}
          />
          {enhanced?.wins_enhanced && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-semibold mb-2">AI Enhanced:</p>
              <p className="text-sm whitespace-pre-wrap">{enhanced.wins_enhanced}</p>
            </div>
          )}
        </Card>
        
        {/* Fun */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3 tracking-[0.2em] uppercase">WHAT I DID FOR FUN</h2>
          <Textarea
            value={journal.fun_activities}
            onChange={(e) => setJournal({...journal, fun_activities: e.target.value})}
            placeholder="Baked sourdough with kids, watched sunset by the fjord, read a book"
            rows={2}
          />
        </Card>
        
        {/* Goals */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3 tracking-[0.2em] uppercase">GOALS & VISION</h2>
          <Textarea
            value={journal.weekly_goals}
            onChange={(e) => setJournal({...journal, weekly_goals: e.target.value})}
            placeholder="Next week: Send 3 emails, convert 10 one-time buyers, reach 75 customers"
            rows={2}
            className="mb-3"
          />
          <Textarea
            value={journal.future_self_vision}
            onChange={(e) => setJournal({...journal, future_self_vision: e.target.value})}
            placeholder="Future vision: Leading voice in AI for women entrepreneurs, $10k MRR, teaching 1000+ women"
            rows={2}
          />
          {enhanced?.future_self_vision_enhanced && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-semibold mb-2">AI Enhanced:</p>
              <p className="text-sm whitespace-pre-wrap">{enhanced.future_self_vision_enhanced}</p>
            </div>
          )}
        </Card>
        
        {/* Actions */}
        <div className="flex gap-4">
          <Button
            onClick={enhanceWithAI}
            disabled={enhancing}
            size="lg"
            className="flex-1"
          >
            {enhancing ? 'Enhancing...' : 'Enhance with AI'}
          </Button>
          
          {enhanced && (
            <Button
              onClick={publishJournal}
              disabled={saving}
              size="lg"
              variant="default"
              className="flex-1"
            >
              Publish to Alex's Knowledge
            </Button>
          )}
        </div>
        
        <p className="text-sm text-gray-500 mt-4 text-center">
          Auto-saves every 30 seconds. Alex will use this to create authentic content in your voice.
        </p>
      </div>
    </div>
  )
}

