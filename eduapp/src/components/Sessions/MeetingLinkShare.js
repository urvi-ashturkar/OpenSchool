import axios from 'axios'
import React, {Component} from 'react'
import { connect } from 'react-redux'
import { Button, Col, FormGroup, Input, Label, Row } from 'reactstrap'
import { fetch_home } from '../../redux/Session/sessionAction'

class MeetingLinkShare extends Component {
    constructor() {
        super()
        this.state = {
            meetingUrL: "",
            urlsent: false
        }
    }

    changeurl = (e) => {
        this.setState({
            meetingUrL: e.target.value
        })
    }

    share = () => {
        console.log(this.state)
        var body = {
            meeting_url: this.state.meetingUrL,
            session_id: this.props.session_id
        }
        axios.post("http://localhost:5000/session/send_meeting_url", body)
        .then(res => {
            // this.setState({
            //     urlsent: true
            // })
            var bod = {
                type: "student_send_url",
                receiver: this.props.student_mail,
                first_name: this.props.student_first,
                last_name: this.props.student_last,
                topic: this.props.topic,
                date: this.props.date,
                time: this.props.time,
                meeting_url: this.state.meetingUrL 
            }
            axios.post("http://localhost:5000/users/sendmail", bod)
            .then(re => {
                console.log("Email sent")
            })
            .catch(er => {
                console.log("mail not sent")
            })
            bod.type = "teacher_send_url"
            bod.first_name = this.props.first_name
            bod.last_name = this.props.last_name
            bod.receiver = this.props.email
            axios.post("http://localhost:5000/users/sendmail", bod)
            .then(re => {
                console.log("Email sent")
            })
            .catch(er => {
                console.log("mail not sent")
            })
            this.props.fetchHome(this.props.user_id, this.props.is_teacher)
        })
        .catch(err=> {
            console.log(err.message)
        })
    }


    render() {
        return(
            <React.Fragment>
                {
                    !this.state.urlsent &&
                    <FormGroup row>
                        <Label for="meeting" sm={2}>Meeting URL</Label>
                        <Col sm={8}>
                            <Input type="text" name="meeting" id="meeting" placeholder="Share meeting url here" onChange={this.changeurl} value={this.state.meetingUrL}></Input>
                        </Col>
                        <Col sm={2}>
                            <Button color="success" onClick={this.share}>Share</Button>
                        </Col>
                    </FormGroup>
                }
                {/* {
                    this.state.urlsent &&
                    <Row>
                        <Col>
                            Meeting Url: <a href={this.state.meetingUrL} target="_blank">{this.state.meetingUrL}</a>
                        </Col>
                    </Row>
                } */}
            </React.Fragment>
        )
    }
}

const mapStateToProps = (state) => {
    return {
        first_name: state.users.first_name,
        last_name: state.users.last_name,
        email: state.users.email_id,
        user_id: state.users.user_id,
        is_teacher: state.users.is_teacher
    }
}

const mapDispatchToProps = (dispatch) => {
    return {
        fetchHome : (id, is_teacher) => dispatch(fetch_home(id, is_teacher))
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(MeetingLinkShare);