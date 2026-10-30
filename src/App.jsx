import Card from './Card';

function App() {
  return (
    <div
      className="app-shell"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgb(232, 220, 198',
        padding: '24px 16px',
      }}
    >
      <Card />
    </div>
  );
}

export default App;
