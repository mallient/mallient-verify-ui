using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Amazon.CDK;
using Amazon.CDK.AWS.Apigatewayv2;
using Amazon.CDK.AWS.CertificateManager;
using Amazon.CDK.AWS.CloudFront;
using Amazon.CDK.AWS.CloudFront.Origins;
using Amazon.CDK.AWS.S3;
using Amazon.CDK.AWS.S3.Deployment;
using Constructs;

namespace Infra
{
    public class CloudfrontStack : MallientStack
    {
        internal CloudfrontStack(Construct scope, string id, string envName, IStackProps props = null)
            : base(scope, id, envName, props)
        {

            var siteBucket = new Bucket(this, $"MVSiteBucket-{envName}", new BucketProps
            {
                BucketName = $"mallient-verify-ui-bucket-{envName}",
                PublicReadAccess = false,
                RemovalPolicy = RemovalPolicy.DESTROY,
                AutoDeleteObjects = true,
                BlockPublicAccess = BlockPublicAccess.BLOCK_ALL
            });

            var oai = new OriginAccessIdentity(this, $"OAI-{envName}", new OriginAccessIdentityProps
            {
                Comment = $"OAI for {envName}"
            });

            //var distribution = new Distribution(this, $"MCSiteDistribution-{envName}", new DistributionProps
            //{
            //    DefaultRootObject = "index.html",
            //    DefaultBehavior = new BehaviorOptions
            //    {
            //        Origin = new S3Origin(siteBucket, new S3OriginProps
            //        {
            //            OriginAccessIdentity = oai
            //        }),
            //        ViewerProtocolPolicy = ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            //        AllowedMethods = AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
            //        CachedMethods = CachedMethods.CACHE_GET_HEAD_OPTIONS
            //    },
            //    ErrorResponses = new IErrorResponse[]
            //    {
            //        new ErrorResponse
            //        {
            //            HttpStatus = 403,
            //            ResponseHttpStatus = 200,
            //            ResponsePagePath = "/index.html",
            //            Ttl = Duration.Seconds(0)
            //        },
            //        new ErrorResponse
            //        {
            //            HttpStatus = 404,
            //            ResponseHttpStatus = 200,
            //            ResponsePagePath = "/index.html",
            //            Ttl = Duration.Seconds(0)
            //        }
            //    }
            //});

            new BucketDeployment(this, $"MCDeployReactApp-{envName}", new BucketDeploymentProps
            {
                Sources = new[] { Source.Asset("../app/dist") },
                DestinationBucket = siteBucket,
                //Distribution = distribution,
                //DistributionPaths = new[] { "/*" }
            });

            //new CfnOutput(this, $"MCCloudFrontURL-{envName}", new CfnOutputProps
            //{
            //    Value = $"https://{distribution.DomainName}",
            //    Description = $"The CloudFront distribution URL for {envName}",
            //    ExportName = $"MCCloudFrontURL-{envName}"
            //});
        }
    }
}
