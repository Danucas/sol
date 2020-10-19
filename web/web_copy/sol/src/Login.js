import React from 'react';
import ReactDOM, { unmountComponentAtNode } from 'react-dom';
import loginStyles from './Login.module.css';
import { MainView } from './App.js';

const cont = document.getElementById('root');

export class Login extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
	}
	render() {
		let full;
		if (this.state.email && this.state.password) {
			full = true;
		}
		return (
			<div className={ loginStyles.login }>
					<h1 className={ loginStyles.title }>Hi! happy to see you today!</h1>
					{this.props.error ? (
						<p className={ [loginStyles.error, loginStyles.info].join(' ') }>{ this.props.error }</p>
					) : (
						<p className={ loginStyles.info }>please use your credentials to access account</p>
					)}
					<div className={ loginStyles.input_containers }>
						<div className={ loginStyles.email }>
							<h1><i></i>e-mail</h1>
							<input name="email" defaultValue={ this.state.email }
								onChange={ (evn) => this.handleChange(evn)}></input>
						</div>
						<div className={loginStyles.passwd}>
							<h1><i></i>password</h1>
							<input name="password" type="password" defaultValue={ this.state.password }
								onChange={ (evn)=> this.handleChange(evn)}></input>
						</div>
					</div>
					{ full ? (
						<button className={ [loginStyles.finish, loginStyles.complete].join(' ') } onClick={ () => this.login() }>Log In</button>
					) : (
						<button className={ loginStyles.finish }>Log In</button>
					)}
					<button className={ loginStyles.create } onClick={()=>{ this.createAccount() }}>Create Account</button>
				</div>
		);
	}
	handleChange(evn) {
		const state = this.state;
		state[evn.target.name] = evn.target.value;
		console.log('Input changed');
		this.setState(state);
	}
	createAccount() {
		console.log('create account');
		ReactDOM.render(
			(
				<Register></Register>
			),
			cont
		);
	}
	login() {
		// console.log(this.state);
		fetch(`http://localhost:3001/auth/login`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(
					this.state
				)
			}
		).then(res => res.json())
		.then(json => {
			console.log(json);
			if (json && json.token) {
				localStorage.setItem('token', json.token);
				ReactDOM.render(
					<MainView></MainView>,
					cont
				);
			} else {
				localStorage.setItem('token', null);
				ReactDOM.render(
					<Login error="Your email or password is wrong"/>,
					cont
				);
			}
		});
	}
}

export class Register extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
	}
	render() {
		let full;
		if (this.state.email && this.state.password && this.state.conf_pass) {
			full = true;
		}
		return (
			<div className={ loginStyles.login }>
					<h1 className={ loginStyles.title }>Hi!, Welcome to ...</h1>
					{this.props.error ? (
						<p className={ [loginStyles.error, loginStyles.info].join(' ') }>{ this.props.error }</p>
					) : (
						<p className={ loginStyles.info }>please use your credentials to create account</p>
					)}
					<div className={ loginStyles.input_containers }>
						<div className={ loginStyles.email }>
							<h1><i></i>e-mail</h1>
							<input name="email" defaultValue={ this.state.email }
								onChange={ (evn) => this.handleChange(evn)}></input>
						</div>
						<div className={loginStyles.passwd}>
							<h1><i></i>password</h1>
							<input name="password" type="password" defaultValue={ this.state.password }
								onChange={ (evn)=> this.handleChange(evn)}></input>
						</div>
						<div className={ loginStyles.passwd }>
							<h1><i></i>confirm password</h1>
							<input name="conf_pass" type="password" defaultValue={ this.state.conf_pass }
								onChange={ (evn) => this.handleChange(evn)}></input>
						</div>
					</div>
					{ full ? (
						<button className={ [loginStyles.finish, loginStyles.complete].join(' ') } onClick={ () => this.register() }>Sign Up</button>
					) : (
						<button className={ loginStyles.finish }>SignUp</button>
					)}
				</div>
		);
	}
	handleChange(evn) {
		const state = this.state;
		state[evn.target.name] = evn.target.value;
		console.log('Input changed');
		this.setState(state);
	}
	createAccount() {
		console.log('create account');
	}
	register() {
		// console.log(this.state);
		fetch(`http://localhost:3001/auth/register`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(
					this.state
				)
			}
		).then(res => res.json())
		.then(json => {
			console.log(json);
			if (json && json.token) {
				localStorage.setItem('token', json.token);
				ReactDOM.render(
					<MainView></MainView>,
					cont
				);
			} else {
				localStorage.setItem('token', null);
				ReactDOM.render(
					<Register error="Couldn't create your account"></Register>,
					cont
				);
			}
		});
	}
}