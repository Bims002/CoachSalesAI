import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { UserProfile } from '../contexts/AuthContext'; // Importer UserProfile en tant que type
import type { SimulationRecord } from './HistoryView';
import { db } from '../firebase-config';
import { collection, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Interface pour les données combinées d'un membre de l'équipe
interface TeamMemberData extends UserProfile {
  simulations: SimulationRecord[];
  averageScore?: number;
  totalSimulations?: number;
}

const Dashboard: React.FC = () => {
  const { currentUser, userProfile } = useAuth();
  const [personalHistory, setPersonalHistory] = useState<SimulationRecord[]>([]);
  const [teamMembersData, setTeamMembersData] = useState<TeamMemberData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      if (!currentUser || !userProfile) {
        setIsLoading(false);
        return;
      }

      // Charger l'historique personnel
      const userHistoryCollection = collection(db, `users/${currentUser.uid}/simulations`);
      const personalQuery = query(userHistoryCollection, orderBy('date', 'desc'), limit(20));
      const personalSnapshot = await getDocs(personalQuery);
      const fetchedPersonalHistory: SimulationRecord[] = personalSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          date: data.date instanceof Timestamp ? data.date.toDate().toLocaleString() : new Date(data.date).toLocaleString(),
          scenarioTitle: data.scenarioTitle,
          score: data.score,
          summary: data.summary,
        };
      });
      setPersonalHistory(fetchedPersonalHistory);

      // Si l'utilisateur est un manager, charger les données de l'équipe
      if (userProfile.role === 'manager' && currentUser.uid) {
        try {
          const usersCollection = collection(db, 'users');
          // Récupérer les commerciaux qui ont ce managerId
          // (Alternative: si le manager a un teamId, récupérer les users avec ce teamId)
          const teamQuery = query(usersCollection, where('managerId', '==', currentUser.uid));
          const teamSnapshot = await getDocs(teamQuery);
          
          const membersDataPromises = teamSnapshot.docs.map(async (memberDoc) => {
            const memberProfile = memberDoc.data() as UserProfile;
            const memberSimulationsCollection = collection(db, `users/${memberProfile.uid}/simulations`);
            const memberSimsQuery = query(memberSimulationsCollection, orderBy('date', 'desc'));
            const memberSimsSnapshot = await getDocs(memberSimsQuery);
            
            const simulations: SimulationRecord[] = memberSimsSnapshot.docs.map(simDoc => {
              const data = simDoc.data();
              return {
                id: simDoc.id,
                date: data.date instanceof Timestamp ? data.date.toDate().toLocaleString() : new Date(data.date).toLocaleString(),
                scenarioTitle: data.scenarioTitle,
                score: data.score,
                summary: data.summary,
              };
            });
            
            const validScores = simulations.filter(sim => typeof sim.score === 'number' && !isNaN(sim.score));
            const averageScore = validScores.length > 0 
              ? validScores.reduce((acc, sim) => acc + (sim.score ?? 0), 0) / validScores.length 
              : 0;

            return { 
              ...memberProfile, 
              simulations, 
              averageScore,
              totalSimulations: simulations.length 
            };
          });
          
          const resolvedMembersData = await Promise.all(membersDataPromises);
          setTeamMembersData(resolvedMembersData);

        } catch (error) {
          console.error("Erreur lors de la récupération des données de l'équipe:", error);
        }
      }
      setIsLoading(false);
    };

    fetchData();
  }, [currentUser, userProfile]);

  if (isLoading) {
    return <div className="app-section" style={{ textAlign: 'center' }}><div className="loader-ia"></div><p>Chargement du tableau de bord...</p></div>;
  }

  // --- Fonctions de rendu pour le tableau de bord personnel ---
  const renderPersonalDashboard = () => {
    if (personalHistory.length === 0) {
      return <p className="placeholder-text" style={{ textAlign: 'center', marginTop: '20px' }}>Aucun progrès à afficher. Effectuez des simulations pour commencer.</p>;
    }
    const sortedHistory = [...personalHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const scoreData = sortedHistory.map((record, index) => ({
      name: `Sim ${index + 1}`,
      score: record.score ?? 0,
      date: new Date(record.date).toLocaleDateString(),
    }));
    const validScores = personalHistory.filter(record => record.score !== null && record.score !== undefined);
    const averageScore = validScores.length > 0 
      ? validScores.reduce((acc, record) => acc + (record.score ?? 0), 0) / validScores.length
      : 0;
    const totalSimulations = personalHistory.length;

    return (
      <>
        <h2>Tableau de Bord Personnel</h2>
        <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '30px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center', padding: '20px', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '8px', minWidth: '200px', margin: '10px' }}>
            <h3>Score Moyen</h3>
            <p style={{ fontSize: '2em', color: 'var(--color-accent)', margin: '0' }}>{averageScore.toFixed(1)} / 100</p>
          </div>
          <div style={{ textAlign: 'center', padding: '20px', backgroundColor: 'var(--color-bg-secondary)', borderRadius: '8px', minWidth: '200px', margin: '10px' }}>
            <h3>Simulations Réalisées</h3>
            <p style={{ fontSize: '2em', color: 'var(--color-accent)', margin: '0' }}>{totalSimulations}</p>
          </div>
        </div>
        <h3>Évolution des Scores</h3>
        {scoreData.length > 1 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={scoreData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="name" stroke="var(--color-text-secondary)" />
              <YAxis domain={[0, 100]} stroke="var(--color-text-secondary)" />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)'}} 
                labelFormatter={(label: string) => `Simulation: ${label}`}
                formatter={(value: number, _name: string, props: any) => [`Score: ${value}`, `Date: ${props.payload.date}`]}
              />
              <Legend />
              <Line type="monotone" dataKey="score" stroke="var(--color-accent)" strokeWidth={2} activeDot={{ r: 8 }} name="Score" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="placeholder-text" style={{ textAlign: 'center' }}>Effectuez au moins deux simulations pour voir l'évolution de vos scores.</p>
        )}
      </>
    );
  };

  // --- Fonctions de rendu pour le tableau de bord manager ---
  const renderManagerDashboard = () => {
    const tổngSimulationsEquipe = teamMembersData.reduce((acc, member) => acc + (member.totalSimulations ?? 0), 0);
    const membresAvecScoresValides = teamMembersData.filter(member => member.totalSimulations && member.totalSimulations > 0 && member.averageScore !== undefined);
    const scoreMoyenEquipe = membresAvecScoresValides.length > 0
      ? membresAvecScoresValides.reduce((acc, member) => acc + (member.averageScore ?? 0), 0) / membresAvecScoresValides.length
      : 0;

    const cardStyle: React.CSSProperties = {
      backgroundColor: 'var(--color-bg-secondary)',
      padding: '20px',
      borderRadius: '8px',
      marginBottom: '20px',
      boxShadow: 'var(--color-shadow) 0px 2px 4px' // Utiliser la variable CSS pour l'ombre
    };
    
    const statItemStyle: React.CSSProperties = {
      marginBottom: '10px',
      fontSize: '1.1em'
    };

    return (
      <>
        <h2>Tableau de Bord Manager</h2>

        <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '30px', flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center', ...cardStyle, minWidth: '220px', margin:'10px' }}>
            <h3 style={{marginTop:0}}>Simulations de l'Équipe</h3>
            <p style={{ fontSize: '2em', color: 'var(--color-accent)', margin: '0' }}>{tổngSimulationsEquipe}</p>
          </div>
          <div style={{ textAlign: 'center', ...cardStyle, minWidth: '220px', margin:'10px' }}>
            <h3 style={{marginTop:0}}>Score Moyen de l'Équipe</h3>
            <p style={{ fontSize: '2em', color: 'var(--color-accent)', margin: '0' }}>
              {scoreMoyenEquipe.toFixed(1)} / 100
            </p>
          </div>
        </div>

        <h3>Performance des Commerciaux</h3>
        {teamMembersData.length === 0 && <p className="placeholder-text" style={{textAlign: 'center'}}>Aucun commercial trouvé pour cette équipe ou aucune donnée de simulation.</p>}
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {teamMembersData.map(member => (
            <div key={member.uid} style={cardStyle}>
              <h4 style={{ marginTop: 0, color: 'var(--color-accent-hover)'}}>{member.displayName || member.email}</h4>
              <p style={statItemStyle}>Simulations : <strong>{member.totalSimulations ?? 0}</strong></p>
              <p style={statItemStyle}>Score Moyen : <strong>{(member.averageScore ?? 0).toFixed(1)} / 100</strong></p>
              {/* TODO: Ajouter un bouton/lien pour voir les détails des simulations du membre */}
              {/* <button style={{fontSize: '0.9rem', padding: '8px 12px', marginTop: '10px'}}>Voir Détails</button> */}
            </div>
          ))}
        </div>
      </>
    );
  };

  return (
    <div className="dashboard-container app-section">
      {userProfile?.role === 'manager' ? renderManagerDashboard() : renderPersonalDashboard()}
    </div>
  );
};

export default Dashboard;
