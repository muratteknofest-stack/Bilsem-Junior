import React,{Component,StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {AuthProvider} from '../../contexts/AuthContext';
import {EnglishApp} from './EnglishApp';
class EnglishBoundary extends Component<{children:React.ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?<main className="en-container en-section"><h1>The puzzles could not load.</h1><p>Please reload the page. If the problem continues, contact zeka.kupu.test@gmail.com.</p><a href="/en/" className="en-primary">Reload ThinkHarbor</a><a href="/" className="en-secondary">Turkish version</a></main>:this.props.children;}}
createRoot(document.getElementById('root')!).render(<StrictMode><EnglishBoundary><AuthProvider><EnglishApp/></AuthProvider></EnglishBoundary></StrictMode>);
